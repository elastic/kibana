export function sortPrefixFirst(array, prefix, property) {
  if (!prefix) return array;
  return [...array].sort(sortPrefixFirstComparator);

  function sortPrefixFirstComparator(a, b) {
    const aValue = '' + (property ? a[property] : a);
    const bValue = '' + (property ? b[property] : b);

    const bothStartWith = aValue.startsWith(prefix) && bValue.startsWith(prefix);
    const neitherStartWith = !aValue.startsWith(prefix) && !bValue.startsWith(prefix);

    if (bothStartWith || neitherStartWith) return 0;
    if (aValue.startsWith(prefix)) return -1;
    else return 1;
  }
}
