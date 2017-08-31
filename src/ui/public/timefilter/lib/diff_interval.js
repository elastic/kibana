import _ from 'lodash';
import { UtilsDiffTimePickerValsProvider } from 'ui/utils/diff_time_picker_vals';

export function TimefilterLibDiffIntervalProvider(Private, $interval, $rootScope) {
  const diff = Private(UtilsDiffTimePickerValsProvider);

  return function (self) {
    let oldRefreshInterval = _.clone(self.refreshInterval);
    let intervalTimeout;

    return function () {
      if (diff(self.refreshInterval, oldRefreshInterval)) {
        const refreshValue = self.refreshInterval.value;
        const refreshPause = self.refreshInterval.pause;

        if (_.isNumber(refreshValue) && !refreshPause) {
          intervalTimeout = $interval(() => $rootScope.$broadcast('courier:searchRefresh'), refreshValue);
        } else if (intervalTimeout) {
          $interval.cancel(intervalTimeout);
        }

        self.emit('update');
        if (!self.refreshInterval.pause && self.refreshInterval.value !== 0) {
          self.emit('fetch');
        }
      }

      oldRefreshInterval = _.clone(self.refreshInterval);
    };
  };
}
