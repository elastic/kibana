import { Numeral } from 'ui/stringify/types/_numeral';

export function stringifyNumber() {
  return Numeral.factory({
    id: 'number',
    title: 'Number',
    sampleInputs: [
      10000, 12.345678, -1, -999, 0.52
    ]
  });
}
