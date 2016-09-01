import d3 from 'd3';
import _ from 'lodash';
import VislibComponentsColorSeedColorsProvider from 'ui/vislib/components/color/seed_colors';
export default function ColorPaletteUtilService(Private) {

  let seedColors = Private(VislibComponentsColorSeedColorsProvider);

  function spectrum(start, end, fraction) {
    start = d3.rgb(start);
    end = d3.rgb(end);

    function scale(c1, c2) {
      let num = (c1 + Math.round((c2 - c1) * fraction));
      num = Math.max(Math.min(num, 255), 0);
      return num;
    }

    return d3
      .rgb(scale(start.r, end.r), scale(start.g, end.g), scale(start.b, end.b))
      .toString();
  }

  function createLevel(seed, level) {
    if (level < 1) return seed;

    let levelSize = Math.pow(2, level - 1);
    let steps = _.times(levelSize, function (i) {
      const numerator = -1 + ((i + 1) * 2);
      const denominator = Math.pow(2, level);
      return numerator / denominator;
    });

    let colors = _.map(seed, function (color, i) {
      let c1 = seed[(i || seed.length) - 1]; // Make a circle, use previous color, or last color in seed array
      let c2 = color;
      return _.map(steps, function (fraction) {
        return spectrum(c1, c2, fraction);
      });
    });

    return _.zipperConcat.apply(this, colors);
  }

  return function (num) {
    if (num <= seedColors.length) return seedColors;

    // Need more colors!
    let colors = seedColors;
    const original = seedColors.base;

    // Figure out what level of the tree we're on
    let level = Math.log(colors.length / original.length) / Math.log(2);

    // Add new levels until we have enough colors
    while (colors.length <= num) {
      colors.push.apply(colors, createLevel(original, ++level));
    }

    return colors;
  };

};
