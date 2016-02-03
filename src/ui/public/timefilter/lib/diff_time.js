import _ from 'lodash';
import UtilsDiffTimePickerValsProvider from 'ui/utils/diff_time_picker_vals';
define(function (require) {
  return function diffTimeProvider(Private) {
    var diff = Private(UtilsDiffTimePickerValsProvider);

    return function (self) {
      var oldTime = _.clone(self.time);
      return function () {
        if (diff(self.time, oldTime)) {
          self.emit('update');
          self.emit('fetch');
        }
        oldTime = _.clone(self.time);
      };
    };
  };
});
