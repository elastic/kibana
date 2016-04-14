define(function (require) {
  let _ = require('lodash');

  return function GetPieNames(Private) {
    let returnNames = Private(require('ui/vislib/components/labels/pie/return_pie_names'));

    return function (data, columns) {
      let slices = data.slices;

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
});
