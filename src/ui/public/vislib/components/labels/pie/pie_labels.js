import _ from 'lodash';
import VislibComponentsLabelsPieRemoveZeroSlicesProvider from 'ui/vislib/components/labels/pie/remove_zero_slices';
import VislibComponentsLabelsPieGetPieNamesProvider from 'ui/vislib/components/labels/pie/get_pie_names';

export default function PieLabels(Private) {
  var removeZeroSlices = Private(VislibComponentsLabelsPieRemoveZeroSlicesProvider);
  var getNames = Private(VislibComponentsLabelsPieGetPieNamesProvider);

  return function (obj) {
    if (!_.isObject(obj)) { throw new TypeError('PieLabel expects an object'); }

    var data = obj.columns || obj.rows || [obj];
    var names = [];

    data.forEach(function (obj) {
      var columns = obj.raw ? obj.raw.columns : undefined;
      obj.slices = removeZeroSlices(obj.slices);

      getNames(obj, columns).forEach(function (name) {
        names.push(name);
      });
    });

    return _.uniq(names);
  };
};
