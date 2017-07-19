import _ from 'lodash';
import { VislibComponentsLabelsPieRemoveZeroSlicesProvider } from './remove_zero_slices';
import { VislibComponentsLabelsPieGetPieNamesProvider } from './get_pie_names';

export function VislibComponentsLabelsPiePieLabelsProvider(Private) {
  const removeZeroSlices = Private(VislibComponentsLabelsPieRemoveZeroSlicesProvider);
  const getNames = Private(VislibComponentsLabelsPieGetPieNamesProvider);

  return function (obj) {
    if (!_.isObject(obj)) { throw new TypeError('PieLabel expects an object'); }

    const data = obj.columns || obj.rows || [obj];
    const names = [];

    data.forEach(function (obj) {
      const columns = obj.raw ? obj.raw.columns : undefined;
      obj.slices = removeZeroSlices(obj.slices);

      getNames(obj, columns).forEach(function (name) {
        names.push(name);
      });
    });

    return _.uniq(names);
  };
}
