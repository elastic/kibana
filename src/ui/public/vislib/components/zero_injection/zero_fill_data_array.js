define(function (require) {
  return function ZeroFillDataArrayUtilService(Private) {
    var _ = require('lodash');

    /*
     * Accepts an array of zero-filled y value objects (arr1)
     * and a kibana data.series[i].values array of objects (arr2).
     * Return a zero-filled array of objects (arr1).
     */

    return function (arr1, arr2) {
      if (!_.isArray(arr1) || !_.isArray(arr2)) {
        throw new TypeError('ZeroFillDataArrayUtilService expects 2 arrays');
      }

      var max = arr2.length;
      var getX = function (d) {
        return d.x === val.x;
      };
      var i;
      var val;
      var index;

      for (i = 0; i < max; i++) {
        val = arr2[i];
        index = _.findIndex(arr1, getX);
        arr1.splice(index, 1, val);
      }

      return arr1;
    };
  };
});