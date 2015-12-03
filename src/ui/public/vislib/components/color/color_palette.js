define(function (require) {
  return function ColorPaletteUtilService(Private) {
    var d3 = require('d3');
    var _ = require('lodash');

    var seedColors = Private(require('ui/vislib/components/color/seed_colors'));

    // Shamelessly borrowed from flot.colorhelpers
    function scale(color, c, f) {
      for (var i = 0; i < c.length; ++i) {
        color[c.charAt(i)] *= f;
      }
      return normalize(color);
    };

    function normalize(color) {
      function clamp(min, value, max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
      }

      color.r = clamp(0, parseInt(color.r), 255);
      color.g = clamp(0, parseInt(color.g), 255);
      color.b = clamp(0, parseInt(color.b), 255);
      color.a = clamp(0, color.a, 1);
      return color;
    };


    return function (num) {
      // Also shamelessly ported from flot.
      // Generate all the colors, using first the option colors and then
      // variations on those colors once they're exhausted.

      var color;
      var colors = [];
      var colorPool = seedColors;
      var colorPoolSize = colorPool.length;
      var variation = 0;

      for (var i = 0; i < num; i++) {

        color = d3.rgb(colorPool[i % colorPoolSize]);

        // Each time we exhaust the colors in the pool we adjust
        // a scaling factor used to produce more variations on
        // those colors. The factor alternates negative/positive
        // to produce lighter/darker colors.

        // Reset the variation after every few cycles, or else
        // it will end up producing only white or black colors.

        if (i % colorPoolSize === 0 && i) {
          if (variation >= 0) {
            if (variation < 0.5) {
              variation = -variation - 0.2;
            } else variation = 0;
          } else variation = -variation;
        }

        colors[i] = scale(color, 'rgb', 1 + variation);
      }
      return colors;

    };

  };
});
