import _ from 'lodash';
import d3 from 'd3';
import { createColorPalette } from './color_palette';

export function VisColorMappedColorsProvider(config, $rootScope) {
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
      $rootScope.$on('$routeChangeStart', () => this.purge());
      this.oldMap = {};
      this.mapping = {};
    }

    get(key) {
      return getConfigColorMapping()[key] || this.mapping[key];
    }

    flush() {
      this.oldMap = _.clone(this.mapping);
      this.mapping = {};
    }

    purge() {
      this.oldMap = {};
      this.mapping = {};
    }

    mapKeys(keys) {
      const configMapping = getConfigColorMapping();
      const configColors = _.values(configMapping);
      const oldColors = _.values(this.oldMap);

      const keysToMap = [];
      _.each(keys, (key) => {
        // If this key is mapped in the config, it's unnecessary to have it mapped here
        if (configMapping[key]) delete this.mapping[key];

        // If this key is mapped to a color used by the config color mapping, we need to remap it
        if (_.contains(configColors, this.mapping[key])) keysToMap.push(key);

        // if key exist in oldMap, move it to mapping
        if (this.oldMap[key]) this.mapping[key] = this.oldMap[key];

        // If this key isn't mapped, we need to map it
        if (this.get(key) == null) keysToMap.push(key);
      });

      // Generate a color palette big enough that all new keys can have unique color values
      const allColors = _(this.mapping).values().union(configColors).union(oldColors).value();
      const colorPalette = createColorPalette(allColors.length + keysToMap.length);
      let newColors = _.difference(colorPalette, allColors);

      while (keysToMap.length > newColors.length) {
        newColors = newColors.concat(_.sample(allColors, keysToMap.length - newColors.length));
      }

      _.merge(this.mapping, _.zipObject(keysToMap, newColors));
    }
  }

  return new MappedColors();
}
