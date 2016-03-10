import _ from 'lodash';
import IndexPatternsFieldFormatProvider from 'ui/index_patterns/_field_format/field_format';
export default function IpFormatProvider(Private) {
  var FieldFormat = Private(IndexPatternsFieldFormatProvider);

  _.class(Ip).inherits(FieldFormat);
  function Ip(params) {
    Ip.Super.call(this, params);
  }

  Ip.id = 'ip';
  Ip.title = 'IP Address';
  Ip.fieldType = 'ip';

  Ip.prototype._convert = function (val) {
    if (!isFinite(val)) return val;

    // shazzam!
    return [val >>> 24, val >>> 16 & 0xFF, val >>> 8 & 0xFF, val & 0xFF].join('.');
  };

  return Ip;
};
