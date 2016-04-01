define(function (require) {
  return function UniqueXValuesUtilService(Private) {
    let _ = require('lodash');

    let flattenDataArray = Private(require('ui/vislib/components/zero_injection/flatten_data'));

    /*
     * Accepts a Kibana data object.
     * Returns an object with unique x axis values as keys with an object of
     * their index numbers and an isNumber boolean as their values.
     * e.g. { 'xAxisValue': { index: 1, isNumber: false }}, ...
     */

    return function (obj) {
      if (!_.isObject(obj)) {
        throw new TypeError('UniqueXValuesUtilService expects an object');
      }

      let flattenedData = flattenDataArray(obj);
      let uniqueXValues = new Map();

      let charts;
      if (!obj.series) {
        charts = obj.rows ? obj.rows : obj.columns;
      } else {
        charts = [obj];
      }

      let isDate = charts.every(function (chart) {
        return chart.ordered && chart.ordered.date;
      });

      let isOrdered = charts.every(function (chart) {
        return chart.ordered;
      });

      flattenedData.forEach(function (d, i) {
        let key = d.x;
        let prev = uniqueXValues.get(key);

        if (d.xi != null) {
          i = d.xi;
        }

        if (prev) {
          i = Math.min(i, prev.index);
        }

        uniqueXValues.set(key, {
          index: i,
          isDate: isDate,
          isOrdered: isOrdered,
          isNumber: _.isNumber(key)
        });
      });

      return uniqueXValues;
    };
  };
});
