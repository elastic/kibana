import _ from 'lodash';
import VislibComponentsZeroInjectionFlattenDataProvider from './flatten_data';
export default function UniqueXValuesUtilService(Private) {

  const flattenDataArray = Private(VislibComponentsZeroInjectionFlattenDataProvider);

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

    const flattenedData = flattenDataArray(obj);
    const uniqueXValues = new Map();

    let charts;
    if (!obj.series) {
      charts = obj.rows ? obj.rows : obj.columns;
    } else {
      charts = [obj];
    }

    const isDate = charts.every(function (chart) {
      return chart.ordered && chart.ordered.date;
    });

    const isOrdered = charts.every(function (chart) {
      return chart.ordered;
    });

    flattenedData.forEach(function (d, i) {
      const key = d.x;
      const prev = uniqueXValues.get(key);
      let sum = d.y;
      if (d.xi != null) {
        i = d.xi;
      }

      if (prev) {
        i = Math.min(i, prev.index);
        sum += prev.sum;
      }

      uniqueXValues.set(key, {
        index: i,
        isDate: isDate,
        isOrdered: isOrdered,
        isNumber: _.isNumber(key),
        sum: sum
      });
    });

    return uniqueXValues;
  };
}
