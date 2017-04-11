import moment from 'moment';

export default {
  // travel forward in time based on the interval between from and to
  stepForward({ min, max }) {
    const diff = max.diff(min);
    return {
      from: moment(max).add(1, 'ms').toISOString(),
      to: moment(max).add(diff + 1, 'ms').toISOString(),
      mode: 'absolute'
    };
  },

  // travel backwards in time based on the interval between from and to
  stepBackward({ min, max }) {
    const diff = max.diff(min);
    return {
      from: moment(min).subtract(diff + 1, 'ms').toISOString(),
      to: moment(min).subtract(1, 'ms').toISOString(),
      mode: 'absolute'
    };
  },

  // zoom out, doubling the difference between start and end, keeping the same time range center
  zoomOut({ min, max }) {
    const diff = max.diff(min);
    return {
      from: moment(min).subtract(diff / 2, 'ms').toISOString(),
      to: moment(max).add(diff / 2, 'ms').toISOString(),
      mode: 'absolute'
    };
  },

  // zoom in, halving the difference between start and end, keeping the same time range center
  zoomIn({ min, max }) {
    const diff = max.diff(min);
    return {
      from: moment(min).add(diff / 4, 'ms').toISOString(),
      to: moment(max).subtract(diff / 4, 'ms').toISOString(),
      mode: 'absolute'
    };
  }
};
