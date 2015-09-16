define((require) => (Private, config) => {
  const _ = require('lodash');
  const d3 = require('d3');
  const createColorPalette = Private(require('ui/vislib/components/color/color_palette'));

  const standardizeColor = (color) => d3.rgb(color).toString();
  function getConfigColorMapping() {
    return _.mapValues(config.get('visualization:colorMapping'), standardizeColor);
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

      // Generate a color palette big enough that all new keys can have unique color values
      const allColors = _(this.mapping).values().union(configColors).value();
      const colorPalette = createColorPalette(allColors.length + keysToMap.length);
      const newColors = _.difference(colorPalette, allColors);
      _.merge(this.mapping, _.zipObject(keysToMap, newColors));
    }
  }

  return new MappedColors();
});
