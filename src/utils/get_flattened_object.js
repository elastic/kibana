/**
 *  Flattens a deeply nested object to a map of dot-separated
 *  paths pointing to all primative values from `rootValue`.
 *
 *  @param {Object} rootValue
 *  @param {Object} [options={}]
 *  @property {Boolean} [options.traverseArrays=true] enable or disable creating output
 *                                                    keys for each item in an array
 *  @returns {Object}
 */
export function getFlattenedObject(rootValue, options = {}) {
  const {
    traverseArrays = true
  } = options;

  function shouldReadKeys(value) {
    if (!traverseArrays && Array.isArray(value)) {
      return false;
    }

    return typeof value === 'object' && value !== null;
  }

  if (!shouldReadKeys(rootValue)) {
    if (Array.isArray(rootValue)) {
      throw new TypeError('Unable to flatten array when `traverseArrays` option is `false`');
    }

    throw new TypeError(`Root value must be an object, received ${typeof rootValue}`);
  }

  const flattenedObject = {};
  function writeKeysToResult(prefix, object) {
    return Object.keys(object).forEach((key) => {
      const value = object[key];
      const path = prefix ? `${prefix}.${key}` : key;

      if (shouldReadKeys(value)) {
        return writeKeysToResult(path, value);
      } else {
        flattenedObject[path] = value;
      }
    });
  }

  writeKeysToResult('', rootValue);
  return flattenedObject;
}
