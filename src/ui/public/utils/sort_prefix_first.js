import { partition } from 'lodash';

export function sortPrefixFirst(array, prefix, property) {
  if (!prefix) return array;
  const lowerCasePrefix = ('' + prefix).toLowerCase();

  const partitions = partition(array, entry => {
    const value = ('' + (property ? entry[property] : entry)).toLowerCase();
    return value.startsWith(lowerCasePrefix);
  });
  return [ ...partitions[0], ...partitions[1] ];
}
