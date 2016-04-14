define(function (require) {
  return function GetArrayUtilService(Private) {
    let _ = require('lodash');
    let flattenSeries = Private(require('ui/vislib/components/labels/flatten_series'));

    /*
     * Accepts a Kibana data object and returns an array of values objects.
    */
    return function (obj) {
      if (!_.isObject(obj) || !obj.rows && !obj.columns && !obj.series) {
        throw new TypeError('GetArrayUtilService expects an object with a series, rows, or columns key');
      }

      if (!obj.series) return flattenSeries(obj);
      return obj.series;
    };
  };
});
