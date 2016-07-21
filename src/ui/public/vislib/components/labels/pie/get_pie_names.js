define(function (require) {
  var _ = require('lodash');

  return function GetPieNames(Private) {
    var returnNames = Private(require('ui/vislib/components/labels/pie/return_pie_names'));

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
});
