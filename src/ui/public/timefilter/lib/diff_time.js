import _ from 'lodash';
import { UtilsDiffTimePickerValsProvider } from 'ui/utils/diff_time_picker_vals';
import { timeHistory } from 'ui/timefilter/time_history';

export function TimefilterLibDiffTimeProvider(Private) {
  const diff = Private(UtilsDiffTimePickerValsProvider);

  return function (self) {
    let oldTime = _.clone(self.time);
    return function () {
      if (diff(self.time, oldTime)) {
        timeHistory.add(self.time);
        self.emit('update');
        self.emit('fetch');
      }
      oldTime = _.clone(self.time);
    };
  };
}
