define(function (require) {
  var _ = require('lodash');

  return function PieLabels(Private) {
    var removeZeroSlices = Private(require('ui/vislib/components/labels/pie/remove_zero_slices'));
    var getNames = Private(require('ui/vislib/components/labels/pie/get_pie_names'));

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
});
