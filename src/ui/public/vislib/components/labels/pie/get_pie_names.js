import _ from 'lodash';
import VislibComponentsLabelsPieReturnPieNamesProvider from 'ui/vislib/components/labels/pie/return_pie_names';

export default function GetPieNames(Private) {
  var returnNames = Private(VislibComponentsLabelsPieReturnPieNamesProvider);

  return function (data, columns) {
    var slices = data.slices;

    if (slices.children) {
      return _(returnNames(slices.children, 0, columns))
      .sortBy(function (obj) {
        return obj.index;
      })
      .pluck('key')
      .unique()
      .value();
    }
  };
};
