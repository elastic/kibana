import StringifyTypesNumeralProvider from 'ui/stringify/types/_numeral';

export default function NumberFormatProvider(Private) {
  const Numeral = Private(StringifyTypesNumeralProvider);
  return Numeral.factory({
    id: 'number',
    title: 'Number',
    sampleInputs: [
      10000, 12.345678, -1, -999, 0.52
    ]
  });
}
