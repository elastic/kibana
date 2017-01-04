/**
 * Provides vislib configuration, throws error if invalid property is accessed without providing defaults
 */
import _ from 'lodash';

export default function MapsConfigFactory() {

  const DEFAULT_VIS_CONFIG = {
    style: {
      margin : { top: 10, right: 3, bottom: 5, left: 3 }
    },
    alerts: {},
    categoryAxes: [],
    valueAxes: []
  };


  class MapsConfig {
    constructor(mapsConfigArgs) {
      this._values = _.defaultsDeep({}, mapsConfigArgs, DEFAULT_VIS_CONFIG);
    }

    get(property, defaults) {
      if (_.has(this._values, property) || typeof defaults !== 'undefined') {
        return _.get(this._values, property, defaults);
      } else {
        throw new Error(`Accessing invalid config property: ${property}`);
        return defaults;
      }
    }

    set(property, value) {
      return _.set(this._values, property, value);
    }
  }

  return MapsConfig;
}
