import _ from 'lodash';
import VislibComponentsLabelsFlattenSeriesProvider from './flatten_series';
export default function GetArrayUtilService(Private) {
  const flattenSeries = Private(VislibComponentsLabelsFlattenSeriesProvider);

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
}
