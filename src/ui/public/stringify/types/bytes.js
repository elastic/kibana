import { Numeral } from 'ui/stringify/types/_numeral';

export function stringifyBytes() {
  return Numeral.factory({
    id: 'bytes',
    title: 'Bytes',
    defaultPatternConfigKey: 'format:bytes:defaultPattern',
    sampleInputs: [1024, 5150000, 1990000000]
  });
}
