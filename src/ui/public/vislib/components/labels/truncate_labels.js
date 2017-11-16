import $ from 'jquery';
import d3 from 'd3';

/***
 *
 * @param text (d3 node containing text)
 * @param size (number of characters to leave)
 * @returns {text} the updated text
 */
const truncateLabel = function (text, size) {
  const node = d3.select(text).node();
  const str = $(node).text();
  if (size === 0) return str;
  if (size >= str.length) return str;
  return str.substr(0, size) + '…';
};

export { truncateLabel };
