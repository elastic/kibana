import _ from 'lodash';
import VislibComponentsZeroInjectionFlattenDataProvider from 'ui/vislib/components/zero_injection/flatten_data';
export default function UniqueXValuesUtilService(Private) {

  var flattenDataArray = Private(VislibComponentsZeroInjectionFlattenDataProvider);

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

    var flattenedData = flattenDataArray(obj);
    var uniqueXValues = new Map();

    let charts;
    if (!obj.series) {
      charts = obj.rows ? obj.rows : obj.columns;
    } else {
      charts = [obj];
    }

    var isDate = charts.every(function (chart) {
      return chart.ordered && chart.ordered.date;
    });

    var isOrdered = charts.every(function (chart) {
      return chart.ordered;
    });

    flattenedData.forEach(function (d, i) {
      var key = d.x;
      var prev = uniqueXValues.get(key);

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
