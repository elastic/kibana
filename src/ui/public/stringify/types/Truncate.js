define(function (require) {
  return function TruncateFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));

    _.class(Truncate).inherits(FieldFormat);

    function Truncate(params) {
      Truncate.Super.call(this, params);
    }

    Truncate.id = 'truncate';
    Truncate.title = 'Truncated String (500 chars)';
    Truncate.fieldType = ['string'];

    Truncate.prototype._convert = function (val) {
      return String(val).substr(0, 500);
    };

    return Truncate;
  };
});