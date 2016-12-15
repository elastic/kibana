import _ from 'lodash';
define(function () {
  return function ZeroFilledArrayUtilService() {

    /*
     * Accepts an array of x axis values (strings or numbers).
     * Returns a zero filled array.
    */

    return function (arr, label) {
      if (!_.isArray(arr)) {
        throw new Error('ZeroFilledArrayUtilService expects an array of strings or numbers');
      }

      const zeroFilledArray = [];

      arr.forEach(function (val) {
        zeroFilledArray.push({
          x: val,
          xi: Infinity,
          y: 0,
          series: label
        });
      });

      return zeroFilledArray;
    };
  };
});
