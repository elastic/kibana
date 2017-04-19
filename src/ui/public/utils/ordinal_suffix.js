// adopted from http://stackoverflow.com/questions/3109978/php-display-number-with-ordinal-suffix
export function ordinalSuffix(num) {
  return num + '' + suffix(num);
}

function suffix(num) {
  const int = Math.floor(parseFloat(num));

  const hunth = int % 100;
  if (hunth >= 11 && hunth <= 13) return 'th';

  const tenth = int % 10;
  if (tenth === 1) return 'st';
  if (tenth === 2) return 'nd';
  if (tenth === 3) return 'rd';
  return 'th';
}
