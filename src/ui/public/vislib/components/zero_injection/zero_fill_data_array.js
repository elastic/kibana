define(function (require) {
  return function ZeroFillDataArrayUtilService(Private) {
    let _ = require('lodash');

    /*
     * Accepts an array of zero-filled y value objects (arr1)
     * and a kibana data.series[i].values array of objects (arr2).
     * Return a zero-filled array of objects (arr1).
     */

    return function (arr1, arr2) {
      if (!_.isArray(arr1) || !_.isArray(arr2)) {
        throw new TypeError('ZeroFillDataArrayUtilService expects 2 arrays');
      }

      let i;
      let val;
      let index;
      let max = arr2.length;

      let getX = function (d) {
        return d.x === val.x;
      };

      for (i = 0; i < max; i++) {
        val = arr2[i];
        index = _.findIndex(arr1, getX);
        arr1.splice(index, 1, val);
      }

      return arr1;
    };
  };
});
