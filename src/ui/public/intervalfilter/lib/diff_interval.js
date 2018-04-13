import _ from 'lodash';
import { UtilsDiffIntervalPickerValsProvider } from 'ui/utils/diff_interval_picker_vals';

export function IntervalfilterLibDiffIntervalProvider(Private) {
  const diff = Private(UtilsDiffIntervalPickerValsProvider);

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
