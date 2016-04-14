define(function (require) {
  return function ColorPaletteUtilService(Private) {
    let d3 = require('d3');
    let _ = require('lodash');

    let seedColors = Private(require('ui/vislib/components/color/seed_colors'));


    /*
     * Generates an array of hex colors the length of the input number.
     * If the number is greater than the length of seed colors available,
     * new colors are generated up to the value of the input number.
     */

    let offset = 300; // Hue offset to start at

    let fraction = function (goal) {
      let walkTree = function (numerator, denominator, bytes) {
        if (bytes.length) {
          return walkTree(
            (numerator * 2) + (bytes.pop() ? 1 : -1),
            denominator * 2,
            bytes
          );

        } else {
          return numerator / denominator;
        }
      };

      let b = (goal + 2)
        .toString(2)
        .split('')
        .map(function (num) {
          return parseInt(num, 10);
        });
      b.shift();

      return walkTree(1, 2, b);

    };

    return function (num) {
      if (!_.isNumber(num)) {
        throw new TypeError('ColorPaletteUtilService expects a number');
      }

      let colors = seedColors;

      let seedLength = seedColors.length;

      _.times(num - seedLength, function (i) {
        colors.push(d3.hsl((fraction(i + seedLength + 1) * 360 + offset) % 360, 0.5, 0.5).toString());
      });

      return colors;

    };

  };
});
