import _ from 'lodash';
import VisTypesProvider from './types';
import VislibLibDataProvider from './data';


export default function VisConfigFactory(Private) {

  const Data = Private(VislibLibDataProvider);
  const visTypes = Private(VisTypesProvider);
  const defaults = {
    style: {
      margin : { top: 10, right: 3, bottom: 5, left: 3 }
    },
    alerts: {},
    categoryAxes: [],
    valueAxes: []
  };


  class VisConfig {
    constructor(visConfigArgs, data, uiState) {
      this.data = new Data(data, uiState);

      const typeDefaults = visTypes[visConfigArgs.type](visConfigArgs, this.data);
      this._values = _.defaultsDeep({}, typeDefaults, defaults);
    };

    get(property, defaults) {
      if (_.has(this._values, property) || typeof defaults !== 'undefined') {
        return _.get(this._values, property, defaults);
      } else {
        throw new Error(`Accessing invalid config property: ${property}`);
        return defaults;
      }
    };

    set(property, value) {
      return _.set(this._values, property, value);
    };
  }

  return VisConfig;
}
