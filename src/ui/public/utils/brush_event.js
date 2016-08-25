import moment from 'moment';
export default function brushEventProvider(timefilter) {
  return function (event) {
    const from = moment(event.range[0]);
    const to = moment(event.range[1]);

    if (to - from === 0) return;

    timefilter.time.from = from;
    timefilter.time.to = to;
    timefilter.time.mode = 'absolute';
  };
};
