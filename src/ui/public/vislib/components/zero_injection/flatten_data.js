import _ from 'lodash';

export function VislibComponentsZeroInjectionFlattenDataProvider() {

  /*
   * Accepts a Kibana data object, flattens the data.series values array,
   * and returns an array of values objects.
   */

  return function (obj) {
    let charts;

    if (!_.isObject(obj) || !obj.rows && !obj.columns && !obj.series) {
      throw new TypeError('FlattenDataObjUtilService expects an object with a series, rows, or columns key');
    }

    if (!obj.series) {
      charts = obj.rows ? obj.rows : obj.columns;
    }

    return _(charts ? charts : [obj])
    .pluck('series')
    .flattenDeep()
    .pluck('values')
    .flattenDeep()
    .filter(Boolean)
    .value();
  };
}
