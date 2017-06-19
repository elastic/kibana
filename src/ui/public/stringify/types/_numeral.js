import _ from 'lodash';
import numeral from 'numeral';
import 'ui/field_format_editor/numeral/numeral';
import { FieldFormat } from 'ui/index_patterns/_field_format/field_format';

const numeralInst = numeral();

_.class(Numeral).inherits(FieldFormat);
export function Numeral(params) {
  Numeral.Super.call(this, params);
}

Numeral.prototype._convert = function (val) {
  if (val === -Infinity) return '-∞';
  if (val === +Infinity) return '+∞';
  if (typeof val !== 'number') {
    val = parseFloat(val);
  }

  if (isNaN(val)) return '';

  return numeralInst.set(val).format(this.param('pattern'));
};


Numeral.factory = function (opts) {
  _.class(Class).inherits(Numeral);
  function Class(params, getConfig) {
    Class.Super.call(this, params);

    this.getConfig = getConfig;
  }

  Class.id = opts.id;
  Class.title = opts.title;
  Class.fieldType = 'number';

  Class.editor = {
    template: opts.editorTemplate || require('ui/field_format_editor/numeral/numeral.html'),
    controllerAs: 'cntrl',
    controller: opts.controller || function () {
      this.sampleInputs = opts.sampleInputs;
    }
  };

  Class.prototype.getParamDefaults = function () {
    if (_.has(opts, 'getParamDefaults')) {
      return opts.getParamDefaults(this.getConfig);
    }

    return {
      pattern: this.getConfig(`format:${opts.id}:defaultPattern`)
    };
  };

  if (opts.prototype) {
    _.assign(Class.prototype, opts.prototype);
  }

  return Class;
};
