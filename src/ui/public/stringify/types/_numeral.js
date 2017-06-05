import _ from 'lodash';
import 'ui/field_format_editor/numeral/numeral';
import { IndexPatternsFieldFormatProvider } from 'ui/index_patterns/_field_format/field_format';
import { BoundToConfigObjProvider } from 'ui/bound_to_config_obj';

export function StringifyTypesNumeralProvider(Private) {
  const FieldFormat = Private(IndexPatternsFieldFormatProvider);
  const BoundToConfigObj = Private(BoundToConfigObjProvider);
  const numeral = require('numeral')();

  _.class(Numeral).inherits(FieldFormat);
  function Numeral(params) {
    Numeral.Super.call(this, params);
  }

  Numeral.prototype._convert = function (val) {
    if (val === -Infinity) return '-∞';
    if (val === +Infinity) return '+∞';
    if (typeof val !== 'number') {
      val = parseFloat(val);
    }

    if (isNaN(val)) return '';

    return numeral.set(val).format(this.param('pattern'));
  };


  Numeral.factory = function (opts) {
    _.class(Class).inherits(Numeral);
    function Class(params) {
      Class.Super.call(this, params);
    }

    Class.id = opts.id;
    Class.title = opts.title;
    Class.fieldType = 'number';

    Class.paramDefaults = opts.paramDefaults || new BoundToConfigObj({
      pattern: '=format:' + opts.id + ':defaultPattern',
    });

    Class.editor = {
      template: opts.editorTemplate || require('ui/field_format_editor/numeral/numeral.html'),
      controllerAs: 'cntrl',
      controller: opts.controller || function () {
        this.sampleInputs = opts.sampleInputs;
      }
    };

    if (opts.prototype) {
      _.assign(Class.prototype, opts.prototype);
    }

    return Class;
  };

  return Numeral;
}
