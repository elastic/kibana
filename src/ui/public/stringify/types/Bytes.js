define(function (require) {
  return function BytesFormatProvider(Private) {
    let Numeral = Private(require('ui/stringify/types/_Numeral'));
    return Numeral.factory({
      id: 'bytes',
      title: 'Bytes',
      sampleInputs: [1024, 5150000, 1990000000]
    });
  };
});
