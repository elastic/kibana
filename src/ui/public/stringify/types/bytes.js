import { StringifyTypesNumeralProvider } from 'ui/stringify/types/_numeral';

export function stringifyBytes(Private) {
  const Numeral = Private(StringifyTypesNumeralProvider);
  return Numeral.factory({
    id: 'bytes',
    title: 'Bytes',
    sampleInputs: [1024, 5150000, 1990000000]
  });
}
