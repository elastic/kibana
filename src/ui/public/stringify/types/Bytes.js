import StringifyTypesNumeralProvider from 'ui/stringify/types/_Numeral';

define(function (require) {
  return function BytesFormatProvider(Private) {
    var Numeral = Private(StringifyTypesNumeralProvider);
    return Numeral.factory({
      id: 'bytes',
      title: 'Bytes',
      sampleInputs: [1024, 5150000, 1990000000]
    });
  };
});
