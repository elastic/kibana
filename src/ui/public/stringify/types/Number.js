import StringifyTypesNumeralProvider from 'ui/stringify/types/_Numeral';

define(function (require) {
  return function NumberFormatProvider(Private) {
    var Numeral = Private(StringifyTypesNumeralProvider);
    return Numeral.factory({
      id: 'number',
      title: 'Number',
      sampleInputs: [
        10000, 12.345678, -1, -999, 0.52
      ]
    });
  };
});
