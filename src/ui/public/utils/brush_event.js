define(function (require) {
  let moment = require('moment');
  return function brushEventProvider(timefilter) {
    return function (event) {
      let from = moment(event.range[0]);
      let to = moment(event.range[1]);

      if (to - from === 0) return;

      timefilter.time.from = from;
      timefilter.time.to = to;
      timefilter.time.mode = 'absolute';
    };
  };
});
