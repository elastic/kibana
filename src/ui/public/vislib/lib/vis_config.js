/**
 * Provides vislib configuration, throws error if invalid property is accessed without providing defaults
 */
import _ from 'lodash';
import { VislibTypesProvider } from './types';
import { VislibLibDataProvider } from './data';

export function VislibVisConfigProvider(Private) {

  const Data = Private(VislibLibDataProvider);
  const visTypes = Private(VislibTypesProvider);
  const DEFAULT_VIS_CONFIG = {
    style: {
      margin : { top: 10, right: 3, bottom: 5, left: 3 }
    },
    alerts: [],
    categoryAxes: [],
    valueAxes: [],
    grid: {}
  };


  class VisConfig {
    constructor(visConfigArgs, data, uiState, el) {
      this.data = new Data(data, uiState);

      const visType = visTypes[visConfigArgs.type];
      const typeDefaults = visType(visConfigArgs, this.data);
      this._values = _.defaultsDeep({}, typeDefaults, DEFAULT_VIS_CONFIG);
      this._values.el = el;
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

  return VisConfig;
}
