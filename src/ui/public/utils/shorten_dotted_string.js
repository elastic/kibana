const DOT_PREFIX_RE = /(.).+?\./g;

/**
 * Convert a dot.notated.string into a short
 * version (d.n.string)
 *
 * @param {string} str - the long string to convert
 * @return {string}
 */
export function shortenDottedString(input) {
  return typeof input !== 'string' ? input : input.replace(DOT_PREFIX_RE, '$1.');
}
