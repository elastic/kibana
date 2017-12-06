const uniqueConcat = (arrayA, arrayB) => arrayB.reduce((acc, key) => (
  acc.includes(key)
    ? acc
    : acc.concat(key)
), arrayA);

/**
 * Assign the keys from both objA and objB to target after passing the
 * current and new value through merge as `(target[key], source[key])`
 * @param  {Object} objA
 * @param  {Object} objB
 * @param  {Function} merge
 * @return {Object} target
 */
export function mergeWith(objA, objB, merge) {
  const target = {};
  const keys = uniqueConcat(Object.keys(objA), Object.keys(objB));
  for (const key of keys) {
    target[key] = merge(objA[key], objB[key]);
  }
  return target;
}
