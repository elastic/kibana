define((require) => (Private, config) => {
  const _ = require('lodash');
  const d3 = require('d3');
  const createColorPalette = Private(require('ui/vislib/components/color/color_palette'));
  const standardizeColor = (color) => d3.rgb(color).toString();

  function getConfigColorMapping() {
    return _.mapValues(config.get('visualization:colorMapping'), standardizeColor);
  }

  // Returns a true if any generated colors match colors that are off limits.
  // e.g. off limit colors => colors from the config('visualization:colorMapping').
  function areColorConflicts(newColors, configColors) {
    return newColors.some(function (color) {
      return _.includes(configColors, color);
    });
  }

  // Returns a random color from a generated array of num (n) colors
  function generateRandomColor(num) {
    var colors = createColorPalette(num);
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Replaces any colors that match off limit colors with randomly generated
  // colors from the colorPalette generation function. num defaults to 56.
  // 56 => total number of randomly generated colors given 8 seed colors and
  // 7 variation values (8 * 7)
  function replaceColors(newColors, configColors, num) {
    num = num || 56;

    function mapColor(color) {
      if (_.includes(configColors, color)) {
        var randomColor = generateRandomColor(num);

        if (_.includes(configColors, randomColor)) {
          return mapColor(randomColor);
        }
        return randomColor;
      }
      return color;
    }

    return newColors.map(mapColor);
  }

  // Returns an array of colors that do not conflict with off-limit colors, i.e. configColors.
  function validateColors(newColors, configColors, num) {
    var conflicts = areColorConflicts(newColors, configColors);

    if (conflicts) { return replaceColors(newColors, configColors, num); }

    return newColors;
  }

  /*
   * Maintains a lookup table that associates the value (key) with a hex color (value)
   * across the visualizations.
   * Provides functions to interact with the lookup table
   */
  class MappedColors {
    constructor() {
      this.mapping = {};
    }

    get(key) {
      return getConfigColorMapping()[key] || this.mapping[key];
    }

    mapKeys(keys) {
      const configMapping = getConfigColorMapping();
      const configColors = _.values(configMapping);

      const keysToMap = [];
      _.each(keys, (key) => {
        // If this key is mapped in the config, it's unnecessary to have it mapped here
        if (configMapping[key]) delete this.mapping[key];

        // If this key is mapped to a color used by the config color mapping, we need to remap it
        if (_.contains(configColors, this.mapping[key])) keysToMap.push(key);

        // If this key isn't mapped, we need to map it
        if (this.get(key) == null) keysToMap.push(key);
      });

      const allKeys = _.keys(this.mapping);
      const colorPalette = createColorPalette(allKeys.length + keysToMap.length);
      const newColors = colorPalette.slice(allKeys.length);
      const validatedColors = validateColors(newColors, configColors);
      _.merge(this.mapping, _.zipObject(keysToMap, validatedColors));
    }
  }

  return new MappedColors();
});
