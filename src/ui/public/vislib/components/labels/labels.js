import _ from 'lodash';
import { VislibComponentsLabelsDataArrayProvider } from './data_array';
import { VislibComponentsLabelsUniqLabelsProvider } from './uniq_labels';

export function VislibComponentsLabelsLabelsProvider(Private) {

  const createArr = Private(VislibComponentsLabelsDataArrayProvider);
  const getArrOfUniqLabels = Private(VislibComponentsLabelsUniqLabelsProvider);

  /*
   * Accepts a Kibana data object and returns an array of unique labels (strings).
   * Extracts the field formatter from the raw object and passes it to the
   * getArrOfUniqLabels function.
   *
   * Currently, this service is only used for vertical bar charts and line charts.
   */
  return function (obj) {
    if (!_.isObject(obj)) { throw new TypeError('LabelUtil expects an object'); }
    return getArrOfUniqLabels(createArr(obj));
  };
}
