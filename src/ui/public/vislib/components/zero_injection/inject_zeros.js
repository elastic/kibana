define(function (require) {
  return function ZeroInjectionUtilService(Private) {
    let _ = require('lodash');

    let orderXValues = Private(require('ui/vislib/components/zero_injection/ordered_x_keys'));
    let createZeroFilledArray = Private(require('ui/vislib/components/zero_injection/zero_filled_array'));
    let zeroFillDataArray = Private(require('ui/vislib/components/zero_injection/zero_fill_data_array'));

    /*
     * A Kibana data object may have multiple series with different array lengths.
     * This proves an impediment to stacking in the visualization library.
     * Therefore, zero values must be injected wherever these arrays do not line up.
     * That is, each array must have the same x values with zeros filled in where the
     * x values were added.
     *
     * This function and its helper functions accepts a Kibana data object
     * and injects zeros where needed.
     */

    function getDataArray(obj) {
      if (obj.rows) {
        return obj.rows;
      } else if (obj.columns) {
        return obj.columns;
      } else if (obj.series) {
        return [obj];
      }
    }

    return function (obj) {
      if (!_.isObject(obj) || !obj.rows && !obj.columns && !obj.series) {
        throw new TypeError('ZeroInjectionUtilService expects an object with a series, rows, or columns key');
      }

      let keys = orderXValues(obj);
      let arr = getDataArray(obj);

      arr.forEach(function (object) {
        object.series.forEach(function (series) {
          let zeroArray = createZeroFilledArray(keys);

          series.values = zeroFillDataArray(zeroArray, series.values);
        });
      });

      return obj;
    };
  };
});
