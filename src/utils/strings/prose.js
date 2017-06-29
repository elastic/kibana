/**
 *  Converts an array of items into a sentence-ready string.
 *
 *  @param {Array<any>} list
 *  @param {Object} [options={}]
 *  @property {Boolean} [options.inclusive=true] Creates an inclusive list using "and"
 *                                               when `true` (default), otherwise uses "or"
 *  @return {String}
 */
export function formatListAsProse(list, options = {}) {
  const {
    inclusive = true
  } = options;

  if (!Array.isArray(list)) {
    throw new TypeError('formatListAsProse() requires an array');
  }

  const count = list.length;
  const conjunction = inclusive ? 'and' : 'or';

  if (count <= 2) {
    return list.join(` ${conjunction} `);
  }

  return list
    .slice(0, -1)
    .concat(`${conjunction} ${list[count - 1]}`)
    .join(', ');
}
