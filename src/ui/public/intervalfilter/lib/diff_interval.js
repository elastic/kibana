import _ from 'lodash';
import angular from 'angular';

export function IntervalfilterLibDiffIntervalProvider() {
  const valueOf = function (o) {
    if (o) return o.valueOf();
  };

  const diff = (newItem, oldItem) => {
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

  return (self) => {
    let oldInterval = _.clone(self.dateInterval);

    return function () {
      if (diff(self.dateInterval, oldInterval)) {
        self.emit('update');
        self.emit('fetch', self.dateInterval);
      }

      oldInterval = _.clone(self.dateInterval);
    };
  };
}
