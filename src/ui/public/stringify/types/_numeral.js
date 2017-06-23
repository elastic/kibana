import _ from 'lodash';
import numeral from 'numeral';
import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';

const numeralInst = numeral();

export class Numeral extends FieldFormat {
  constructor(params) {
    super(params);
  }

  _convert(val) {
    if (val === -Infinity) return '-∞';
    if (val === +Infinity) return '+∞';
    if (typeof val !== 'number') {
      val = parseFloat(val);
    }

    if (isNaN(val)) return '';

    return numeralInst.set(val).format(this.param('pattern'));
  }
}

Numeral.factory = function (opts) {
  class Class extends Numeral {
    constructor(params, getConfig) {
      super(params);

      this.getConfig = getConfig;
    }

    getParamDefaults = function () {
      if (_.has(opts, 'getParamDefaults')) {
        return opts.getParamDefaults(this.getConfig);
      }

      return {
        pattern: this.getConfig(`format:${opts.id}:defaultPattern`)
      };
    }
  }

  Class.id = opts.id;
  Class.title = opts.title;
  Class.fieldType = 'number';

  if (opts.prototype) {
    _.assign(Class.prototype, opts.prototype);
  }

  return Class;
};
