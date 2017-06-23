import { Numeral } from 'ui/stringify/types/_numeral';

export function stringifyNumber() {
  return Numeral.factory({
    id: 'number',
    title: 'Number'
  });
}
