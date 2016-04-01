define(function (require) {
  return function DiffTimePickerValuesFn() {
    let _ = require('lodash');
    let angular = require('angular');

    let valueOf = function (o) {
      if (o) return o.valueOf();
    };

    return function (rangeA, rangeB) {
      if (_.isObject(rangeA) && _.isObject(rangeB)) {
        if (
          valueOf(rangeA.to) !== valueOf(rangeB.to)
          || valueOf(rangeA.from) !== valueOf(rangeB.from)
          || valueOf(rangeA.value) !== valueOf(rangeB.value)
          || valueOf(rangeA.pause) !== valueOf(rangeB.pause)
        ) {
          return true;
        }
      } else {
        return !angular.equals(rangeA, rangeB);
      }

      return false;
    };
  };
});
