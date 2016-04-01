define(function (require) {
  let _ = require('lodash');
  return function diffTimeProvider(Private) {
    let diff = Private(require('ui/utils/diff_time_picker_vals'));

    return function (self) {
      let oldTime = _.clone(self.time);
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
