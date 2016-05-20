import _ from 'lodash';
import VislibComponentsLabelsPieRemoveZeroSlicesProvider from 'ui/vislib/components/labels/pie/remove_zero_slices';
import VislibComponentsLabelsPieGetPieNamesProvider from 'ui/vislib/components/labels/pie/get_pie_names';

export default function PieLabels(Private) {
  let removeZeroSlices = Private(VislibComponentsLabelsPieRemoveZeroSlicesProvider);
  let getNames = Private(VislibComponentsLabelsPieGetPieNamesProvider);

  return function (obj) {
    if (!_.isObject(obj)) { throw new TypeError('PieLabel expects an object'); }

    let data = obj.columns || obj.rows || [obj];
    let names = [];

    data.forEach(function (obj) {
      let columns = obj.raw ? obj.raw.columns : undefined;
      obj.slices = removeZeroSlices(obj.slices);

      getNames(obj, columns).forEach(function (name) {
        names.push(name);
      });
    });

    return _.uniq(names);
  };
};
