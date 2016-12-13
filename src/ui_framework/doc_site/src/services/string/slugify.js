

/**
 * Lowercases input and replaces spaces with hyphens:
 * e.g. 'GridView Example' -> 'gridview-example'
 */
function one(str) {
  const parts = str
  .toLowerCase()
  .replace(/[-]+/g, ' ')
  .replace(/[^\w^\s]+/g, '')
  .replace(/ +/g, ' ').split(' ');
  return parts.join('-');
}

function each(items, src, dest) {
  return items.map(item => {
    const _item = item;
    _item[dest] = one(_item[src]);
    return _item;
  });
}

export default {
  one,
  each,
};
