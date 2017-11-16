import $ from 'jquery';
import d3 from 'd3';

const truncateLabel = function (text, size) {
  const node = d3.select(text).node();
  let str = $(node).text();
  if (size === 0) return str;

  const width = node.getBBox().width;
  const chars = str.length;
  const pxPerChar = width / chars;
  let endChar = 0;
  const ellipsesPad = 4;

  if (width > size) {
    endChar = Math.floor((size / pxPerChar) - ellipsesPad);
    while (str[endChar - 1] === ' ' || str[endChar - 1] === '-' || str[endChar - 1] === ',') {
      endChar = endChar - 1;
    }
    str = str.substr(0, endChar) + '…';
  }
  return str;
};

export { truncateLabel };
