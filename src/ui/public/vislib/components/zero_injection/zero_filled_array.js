export function VislibComponentsZeroInjectionZeroFilledArrayProvider() {
  /*
   * Accepts an array of x axis values (strings or numbers).
   * Returns a zero filled array.
  */

  return function (arr, label) {
    if (!Array.isArray(arr)) {
      throw new Error('ZeroFilledArrayUtilService expects an array of strings or numbers');
    }

    const zeroFilledArray = [];

    arr.forEach(function (val) {
      zeroFilledArray.push({
        x: val,
        xi: Infinity,
        // make sure the y value is always zero, even when an offset function may change it
        get y() {
          return 0;
        },
        set y(value) {
          // do nothing
        },
        series: label
      });
    });

    return zeroFilledArray;
  };
}
