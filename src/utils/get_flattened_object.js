
function shouldReadKeys(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 *  Flattens a deeply nested object to a map of dot-separated
 *  paths pointing to all primative values **and arrays**
 *  from `rootValue`.
 *
 *  example:
 *    getFlattenedObject({ a: { b: 1, c: [2,3] } })
 *    // => { 'a.b': 1, 'a.c': [2,3] }
 *
 *  @param {Object} rootValue
 *  @returns {Object}
 */
export function getFlattenedObject(rootValue) {
  if (!shouldReadKeys(rootValue)) {
    throw new TypeError(`Root value is not flatten-able, received ${rootValue}`);
  }

  return (function flatten(acc, prefix, object) {
    return Object.keys(object).reduce((acc, key) => {
      const value = object[key];
      const path = prefix ? `${prefix}.${key}` : key;

      if (shouldReadKeys(value)) {
        return flatten(acc, path, value);
      } else {
        return { ...acc, [path]: value };
      }
    }, acc);
  }({}, '', rootValue));
}
