define(function (require) {
  let _ = require('lodash');
  return function diffTimeProvider(Private) {
    let diff = Private(require('ui/utils/diff_time_picker_vals'));

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
  };
});
