import moment from 'moment';

export default {
  // travel forward in time based on the interval between from and to
  stepForward({ min, max }) {
    const diff = max.diff(min);
    return {
      from: max.toISOString(),
      to: moment(max).add(diff).toISOString()
    };
  },

  // travel backwards in time based on the interval between from and to
  stepBackward({ min, max }) {
    const diff = max.diff(min);
    return {
      from: moment(min).subtract(diff).toISOString(),
      to: min.toISOString()
    };
  },

  // zoom out, doubling the difference between start and end, keeping the same time range center
  zoomOut({ min, max }) {
    const diff = max.diff(min);
    return {
      from: moment(min).subtract(diff / 2).toISOString(),
      to: moment(max).add(diff / 2).toISOString()
    };
  },

  // zoom in, halving the difference between start and end, keeping the same time range center
  zoomIn({ min, max }) {
    const diff = max.diff(min);
    return {
      from: moment(min).add(diff / 4).toISOString(),
      to: moment(max).subtract(diff / 4).toISOString()
    };
  }
};
