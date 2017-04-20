export function lodashObjectMixin(_) {
  return _.mixin(_, {

    /**
     * Flatten an object into a single-level object.
     * NOTE: The flatten behavior here works if you don't need to keep a reference to the original value
     *
     * set flattenArrays to traverse into arrays and create properties like:
     *  {
     *    'users.0.name': 'username1',
     *    'users.1.name': 'username2',
     *    'users.2.name': 'username3',
     *  }
     *
     * @param  {string} dot - the seperator for keys, '.' is generally preferred
     * @param  {object} nestedObj - the object to flatten
     * @param  {Boolean} flattenArrays - should arrays be travered or left alone?
     * @return {object}
     */
    flattenWith: function (dot, nestedObj, flattenArrays) {
      const stack = []; // track key stack
      const flatObj = {};

      (function flattenObj(obj) {
        _.keys(obj).forEach(function (key) {
          stack.push(key);
          if (!flattenArrays && _.isArray(obj[key])) flatObj[stack.join(dot)] = obj[key];
          else if (_.isObject(obj[key])) flattenObj(obj[key]);
          else flatObj[stack.join(dot)] = obj[key];
          stack.pop();
        });
      }(nestedObj));

      return flatObj;
    }

  });
}
