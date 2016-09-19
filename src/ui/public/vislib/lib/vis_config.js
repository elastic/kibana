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
    alerts: {}
  };


  class VisConfig {
    constructor(config, data, uiState) {
      if (config.zeroFill) {
        this.data = new Data(injectZeros(data), config, uiState);
      } else {
        this.data = new Data(data, config, uiState);
      }

      const typeDefaults = visTypes[config.type](config, this.data);
      this._values = _.defaultsDeep({}, typeDefaults, defaults);
    };

    get(property, defaults = null) {
      if (_.has(this._values, property)) {
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
