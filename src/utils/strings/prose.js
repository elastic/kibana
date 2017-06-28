export function formatListAsProse(list, options = {}) {
  const {
    inclusive = true
  } = options;

  if (!Array.isArray(list)) {
    return String(list);
  }

  const count = list.length;
  const lastI = count - 1;
  const conjunction = inclusive ? 'and' : 'or';
  return list.reduce((acc, item, i) => {
    if (i === 0) {
      return item;
    }

    if (i === lastI && count >= 3) {
      return `${acc}, ${conjunction} ${item}`;
    }

    if (i === lastI) {
      return `${acc} ${conjunction} ${item}`;
    }

    return `${acc}, ${item}`;
  }, '');
}
