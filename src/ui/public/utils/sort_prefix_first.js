export function sortPrefixFirst(array, prefix, property) {
  if (!prefix) return array;
  const lowerCasePrefix = ('' + prefix).toLowerCase();
  return [...array].sort(sortPrefixFirstComparator);

  function sortPrefixFirstComparator(a, b) {
    const aValue = ('' + (property ? a[property] : a)).toLowerCase();
    const bValue = ('' + (property ? b[property] : b)).toLowerCase();

    const bothStartWith = aValue.startsWith(lowerCasePrefix) && bValue.startsWith(lowerCasePrefix);
    const neitherStartWith = !aValue.startsWith(lowerCasePrefix) && !bValue.startsWith(lowerCasePrefix);

    if (bothStartWith || neitherStartWith) {
      return 0;
    } else if (aValue.startsWith(lowerCasePrefix)) {
      return -1;
    }
    return 1;
  }
}
