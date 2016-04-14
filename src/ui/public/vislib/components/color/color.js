define(function (require) {
  return function ColorUtilService(Private) {
    let _ = require('lodash');
    let mappedColors = Private(require('ui/vislib/components/color/mapped_colors'));

    /*
     * Accepts an array of strings or numbers that are used to create a
     * a lookup table that associates the values (key) with a hex color (value).
     * Returns a function that accepts a value (i.e. a string or number)
     * and returns a hex color associated with that value.
     */

    return function (arrayOfStringsOrNumbers, colorMapping) {
      colorMapping = colorMapping || {};
      if (!_.isArray(arrayOfStringsOrNumbers)) {
        throw new Error('ColorUtil expects an array');
      }

      arrayOfStringsOrNumbers.forEach(function (val) {
        if (!_.isString(val) && !_.isNumber(val) && !_.isUndefined(val)) {
          throw new TypeError('ColorUtil expects an array of strings, numbers, or undefined values');
        }
      });

      mappedColors.mapKeys(arrayOfStringsOrNumbers);

      return function (value) {
        return colorMapping[value] || mappedColors.get(value);
      };
    };
  };
});
