import _ from 'lodash';
import VislibComponentsLabelsPieReturnPieNamesProvider from './return_pie_names';

export function VislibComponentsLabelsPieGetPieNamesProvider(Private) {
  const returnNames = Private(VislibComponentsLabelsPieReturnPieNamesProvider);

  return function (data, columns) {
    const slices = data.slices;

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
}
