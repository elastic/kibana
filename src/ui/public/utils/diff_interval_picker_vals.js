import _ from 'lodash';
import angular from 'angular';

export function UtilsDiffIntervalPickerValsProvider() {

  const valueOf = function (o) {
    if (o) return o.valueOf();
  };

  return function (newItem, oldItem) {
    if (_.isObject(newItem)
      && _.isObject(oldItem)
      && !_.isEmpty(newItem)
      && !_.isEmpty(oldItem)) {
      if (
        valueOf(newItem.value) !== valueOf(oldItem.value)
        || valueOf(newItem.display) !== valueOf(oldItem.display)
      ) {
        return true;
      }
    } else {
      return !angular.equals(newItem, oldItem);
    }

    return false;
  };
}
