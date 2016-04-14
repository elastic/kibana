define(function () {
  return function ZeroFilledArrayUtilService() {
    let _ = require('lodash');

    /*
     * Accepts an array of x axis values (strings or numbers).
     * Returns a zero filled array.
    */

    return function (arr) {
      if (!_.isArray(arr)) {
        throw new Error('ZeroFilledArrayUtilService expects an array of strings or numbers');
      }

      let zeroFilledArray = [];

      arr.forEach(function (val) {
        zeroFilledArray.push({
          x: val,
          xi: Infinity,
          y: 0
        });
      });

      return zeroFilledArray;
    };
  };
});
