import _ from 'lodash';
export default function GetSeriesUtilService() {

  /*
   * Accepts a Kibana data object with a rows or columns key
   * and returns an array of flattened series values.
   */
  return function (obj) {
    if (!_.isObject(obj) || !obj.rows && !obj.columns) {
      throw new TypeError('GetSeriesUtilService expects an object with either a rows or columns key');
    }

    obj = obj.rows ? obj.rows : obj.columns;

    return _.chain(obj)
    .pluck('series')
    .flattenDeep()
    .value();
  };
}
