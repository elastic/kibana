var _ = require('lodash');
export default function diffTimeProvider(Private) {
  var diff = Private(require('ui/utils/diff_time_picker_vals'));

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
