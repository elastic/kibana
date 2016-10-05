import _ from 'lodash';
import VisTypesProvider from 'ui/vislib/lib/types';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import VislibComponentsZeroInjectionInjectZerosProvider from 'ui/vislib/components/zero_injection/inject_zeros';

export default function VisConfigFactory(Private) {

  const Data = Private(VislibLibDataProvider);
  const injectZeros = Private(VislibComponentsZeroInjectionInjectZerosProvider);
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
      if (visConfigArgs.zeroFill || ['area', 'histogram'].includes(visConfigArgs.type)) {
        this.data = new Data(injectZeros(data), uiState);
      } else {
        this.data = new Data(data, uiState);
      }

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
