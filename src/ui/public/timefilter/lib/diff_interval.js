import _ from 'lodash';
import { UtilsDiffTimePickerValsProvider } from 'ui/utils/diff_time_picker_vals';

export function TimefilterLibDiffIntervalProvider(Private) {
  const diff = Private(UtilsDiffTimePickerValsProvider);

  return function (self) {
    let oldRefreshInterval = _.clone(self.refreshInterval);

    return function () {
      if (diff(self.refreshInterval, oldRefreshInterval)) {
        self.emit('update');
        if (!self.refreshInterval.pause && self.refreshInterval.value !== 0) {
          self.emit('fetch');
        }
      }

      oldRefreshInterval = _.clone(self.refreshInterval);
    };
  };
}
