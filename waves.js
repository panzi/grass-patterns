var loopContext;

function init () {
	var width = document.getElementById("width");
	var height = document.getElementById("height");
	var front_color = document.getElementById("front_color");
	var back_color = document.getElementById("back_color");
	var page_bg_color = document.getElementById("page_bg_color");
	var x_offset = document.getElementById("x_offset");
	var y_offset = document.getElementById("y_offset");
	var x_res = document.getElementById("x_res");
	var y_res = document.getElementById("y_res");
	var row_x_offset = document.getElementById("row_x_offset");
	var fps = document.getElementById("fps");
	var funct = document.getElementById("function");
	var canvas = document.getElementById("canvas");

	canvas.width  = Number(width.value);
	canvas.height = Number(height.value);

	document.body.style.background = page_bg_color.value;

	var context = {
		front_color: parseColor(front_color.value),
		back_color: parseColor(back_color.value),
		x_offset: Number(x_offset.value),
		y_offset: Number(y_offset.value),
		x_res: Number(x_res.value),
		y_res: Number(y_res.value),
		row_x_offset: Number(row_x_offset.value),
		code: funct.value,
		funct: new Function("x_ind", "y_ind", "x_pos", "y_pos", "t", "pix", "line", "color", funct.value),
		fps: Number(fps.value),
		canvas: canvas,
		timer: null,
		image: new Image(),
		image_data: null
	};

	function refreshImage () {
		var img_canvas = document.createElement("canvas");
		img_canvas.width  = context.x_res;
		img_canvas.height = context.y_res;
		var ctx = img_canvas.getContext("2d");
		ctx.drawImage(context.image, 0, 0, context.x_res, context.y_res);

		var image_data = ctx.getImageData(0, 0, context.x_res, context.y_res);
		context.image_data = new Array(image_data.data.length / 4);

		for (var i = 0; i < image_data.data.length; ++ i) {
			var off = i * 4;
			var value = (image_data.data[off] + image_data.data[off + 1] + image_data.data[off + 2]) / (3 * 255);
			context.image_data[i] = value;
		}
	}

	context.image.src = "image.png";
	context.image.onload = function () {
		refreshImage();
		redraw(context);
	};

	width.addEventListener("change", function () {
		context.canvas.width = Number(this.value);
		refreshImage();
		redraw(context);
	}, false);

	height.addEventListener("change", function () {
		context.canvas.height = Number(this.value);
		refreshImage();
		redraw(context);
	}, false);

	page_bg_color.addEventListener("change", function () {
		document.body.style.background = this.value;
	}, false);

	front_color.addEventListener("change", function () {
		context.front_color = parseColor(this.value);
		redraw(context);
	}, false);

	back_color.addEventListener("change", function () {
		context.back_color = parseColor(this.value);
		redraw(context);
	}, false);

	x_res.addEventListener("change", function () {
		context.x_res = Number(this.value);
		refreshImage();
		redraw(context);
	}, false);

	y_res.addEventListener("change", function () {
		context.y_res = Number(this.value);
		refreshImage();
		redraw(context);
	}, false);

	x_offset.addEventListener("change", function () {
		context.x_offset = Number(this.value);
		redraw(context);
	}, false);

	y_offset.addEventListener("change", function () {
		context.y_offset = Number(this.value);
		redraw(context);
	}, false);

	row_x_offset.addEventListener("change", function () {
		context.row_x_offset = Number(this.value);
		redraw(context);
	}, false);

	fps.addEventListener("change", function () {
		context.fps = Number(this.value);
		redraw(context);
	}, false);

	function codeChanged () {
		if (this.value !== context.code) {
			context.funct = new Function("x_ind", "y_ind", "x_pos", "y_pos", "t", "pix", "line", "color", this.value);
			context.code = this.value;
			redraw(context);
		}
	}

	funct.addEventListener("input", codeChanged, false);
	funct.addEventListener("change", codeChanged, false);

	loopContext = context;

	redraw(context);
	//context.timer = setTimeout(loop.bind(context), 1000/context.fps);
}

function togglePlayPause () {
	if (loopContext.timer === null) {
		loopContext.timer = setTimeout(loop.bind(loopContext), 1000/loopContext.fps);
	}
	else {
		clearTimeout(loopContext.timer);
		loopContext.timer = null;
	}
}

function parseColor (str) {
	var m;
	if ((m = /^#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i.exec(str))) {
		return {
			r: parseInt(m[1], 16),
			g: parseInt(m[2], 16),
			b: parseInt(m[3], 16),
			a: 255
		};
	}
	else if ((m = /^rgb\(([-0-9\.,\s]*)\)$/.exec(str))) {
		var args = m[1].split(',');
		return {
			r: Number(args[0]),
			g: Number(args[1]),
			b: Number(args[2]),
			a: 255
		};
	}
	else if ((m = /^rgba\(([-0-9\.,\s]*)\)$/.exec(str))) {
		var args = m[1].split(',');
		return {
			r: Number(args[0]),
			g: Number(args[1]),
			b: Number(args[2]),
			a: Math.floor(Number(args[3]) * 255)
		};
	}
	else {
		throw new Error("color format not supported: " + str);
	}
}

function blend (color1, color2, ratio, out) {
	var inv_ratio = 1 - ratio;
	out.r = color1.r * inv_ratio + color2.r * ratio;
	out.g = color1.g * inv_ratio + color2.g * ratio;
	out.b = color1.b * inv_ratio + color2.b * ratio;
	out.a = color1.a * inv_ratio + color2.a * ratio;
}

function format (fmt) {
	function pad (str, fill, padding, right) {
		if (str.length >= fill) {
			return str;
		}
		var padstr = new Array(fill - str.length + 1).join(padding);
		return right ? (padstr + str) : (str + padstr);
	}

	var argind = 1;
	var args = arguments;
	return fmt.replace(/%(-)?(0)?(\d+)?(?:\.(\d+)?)?([dboxXfes%])/g, (all, rightArg, paddingArg, fillArg, decimalArg, fmtArg) => {
		var right   = rightArg !== '-';
		var fill    = fillArg    ? parseInt(fillArg,    10) : 0;
		var decimal = decimalArg ? parseInt(decimalArg, 10) : 6;
		var padding = right      ? (paddingArg || ' ')      : ' ';

		switch (fmtArg) {
			case 'd': return pad((args[argind++] | 0).toString(10), fill, padding, right);
			case 'b': return pad((args[argind++] | 0).toString(2), fill, padding, right);
			case 'o': return pad((args[argind++] | 0).toString(8), fill, padding, right);
			case 'x': return pad((args[argind++] | 0).toString(16), fill, padding, right);
			case 'X': return pad((args[argind++] | 0).toString(16).toUpperCase(), fill, padding, right);
			case 'f': return pad(Number(args[argind++]).toFixed(decimal), fill, padding, right);
			case 'e': return pad(Number(args[argind++]).toExponential(decimal), fill, padding, right);
			case 'E': return pad(Number(args[argind++]).toExponential(decimal).toUpperCase(), fill, padding, right);
			case 's': return pad(String(args[argind++]), fill, ' ', right);
			case '%': return pad('%', fill, ' ', right);
			default:  return all;
		}
	});
}

function stringifyColor (color) {
	return format('rgba(%d, %d, %d, %f)', color.r, color.g, color.b, color.a / 255);
}

function loop () {
	this.timer = setTimeout(loop.bind(this), 1000/this.fps);
	redraw(this);
}

function redraw (context) {
	var ctx = context.canvas.getContext("2d");

	var x_res = context.x_res;
	var y_res = context.y_res;
	var row_x_offset = context.row_x_offset;
	var x_offset = context.x_offset;
	var y_offset = context.y_offset;
	var front_color = context.front_color;
	var back_color = context.back_color;
	var image_data = context.image_data || [];
	var line  = {x1: 0, y1: 0, x2: 0, y2: 0};
	var color = {r: 0, g: 0, b: 0, a: 255};
	var w = context.canvas.width;
	var h = context.canvas.height;
	var t = Date.now();

	ctx.clearRect(0, 0, w, h);
	ctx.lineWidth = 1;
	var color = {r: 0, g: 0, b: 0};
	for (var y = y_res - 1; y >= 0; -- y) {
		var y_pos = y * y_offset;
		var row_off = y * row_x_offset;
		blend(front_color, back_color, 1 - (y_res - y - 1) / (y_res - 1), color);

		for (var x = 0; x < x_res; ++ x) {
			var x_pos = x * x_offset + row_off;
			line.x1 = x_pos;
			line.y1 = y_pos;
			line.x2 = x_pos;
			line.y2 = y_pos;

			color.r = color.r;
			color.g = color.g;
			color.b = color.b;
			color.a = 127;

			var off = (y_res - y - 1) * x_res + x;
			var pix = image_data[off];
			context.funct(x, y, x_pos, y_pos, t, pix, line, color);

			ctx.strokeStyle = stringifyColor(color);

			ctx.beginPath();
			ctx.moveTo(line.x1, h - line.y1);
			ctx.lineTo(line.x2, h - line.y2);
			ctx.stroke();
		}
	}
}
