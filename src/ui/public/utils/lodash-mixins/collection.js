export function lodashCollectionMixin(_) {
  _.mixin(_, {

    /**
     * move an obj either up or down in the collection by
     * injecting it either before/after the prev/next obj that
     * satisfied the qualifier
     *
     * or, just from one index to another...
     *
     * @param  {array} objs - the list to move the object within
     * @param  {number|any} obj - the object that should be moved, or the index that the object is currently at
     * @param  {number|boolean} below - the index to move the object to, or whether it should be moved up or down
     * @param  {function} qualifier - a lodash-y callback, object = _.where, string = _.pluck
     * @return {array} - the objs argument
     */
    move: function (objs, obj, below, qualifier) {
      const origI = _.isNumber(obj) ? obj : objs.indexOf(obj);
      if (origI === -1) return objs;

      if (_.isNumber(below)) {
        // move to a specific index
        objs.splice(below, 0, objs.splice(origI, 1)[0]);
        return objs;
      }

      below = !!below;
      qualifier = _.callback(qualifier);

      const above = !below;
      const finder = below ? _.findIndex : _.findLastIndex;

      // find the index of the next/previous obj that meets the qualifications
      const targetI = finder(objs, function (otherAgg, otherI) {
        if (below && otherI <= origI) return;
        if (above && otherI >= origI) return;
        return !!qualifier(otherAgg, otherI);
      });

      if (targetI === -1) return objs;

      // place the obj at it's new index
      objs.splice(targetI, 0, objs.splice(origI, 1)[0]);
    },

    /**
     * Like _.groupBy, but allows specifying multiple groups for a
     * single object.
     *
     * _.organizeBy([{ a: [1, 2, 3] }, { b: true, a: [1, 4] }], 'a')
     * // Object {1: Array[2], 2: Array[1], 3: Array[1], 4: Array[1]}
     *
     * _.groupBy([{ a: [1, 2, 3] }, { b: true, a: [1, 4] }], 'a')
     * // Object {'1,2,3': Array[1], '1,4': Array[1]}
     *
     * @param  {array} collection - the list of values to organize
     * @param  {Function} callback - either a property name, or a callback.
     * @return {object}
     */
    organizeBy: function (collection, callback) {
      const buckets = {};
      const prop = typeof callback === 'function' ? false : callback;

      function add(key, obj) {
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(obj);
      }

      _.each(collection, function (obj) {
        const keys = prop === false ? callback(obj) : obj[prop];

        if (!_.isArray(keys)) {
          add(keys, obj);
          return;
        }

        let length = keys.length;
        while (length-- > 0) {
          add(keys[length], obj);
        }
      });

      return buckets;
    },

    /**
     * Remove or add a value to an array based on it's presense in the
     * array initially.
     *
     * @param  {array} arr
     * @param  {any} value - the value to toggle
     * @return {array} arr
     */
    toggleInOut: function (arr, value) {
      if (_.contains(arr, value)) {
        arr.splice(arr.indexOf(value), 1);
      } else {
        arr.push(value);
      }
      return arr;
    },

    /**
     * Efficient and safe version of [].push(dest, source);
     *
     * @param  {Array} source - the array to pull values from
     * @param  {Array} dest   - the array to push values into
     * @return {Array} dest
     */
    pushAll: function (source, dest) {
      const start = dest.length;
      const adding = source.length;

      // allocate - http://goo.gl/e2i0S0
      dest.length = start + adding;

      // fill sparse positions
      let i = -1;
      while (++i < adding) dest[start + i] = source[i];

      return dest;
    },


  });
}
