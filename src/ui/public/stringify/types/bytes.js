import { Numeral } from 'ui/stringify/types/_numeral';

export function stringifyBytes() {
  return Numeral.factory({
    id: 'bytes',
    title: 'Bytes'
  });
}
