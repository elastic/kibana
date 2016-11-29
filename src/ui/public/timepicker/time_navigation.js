import moment from 'moment';

export default {
  stepForward({min, max}) {
    const diff = max.diff(min);
    return {
      from: max.toISOString(),
      to: moment(max).add(diff).toISOString()
    };
  },

  stepBackward({min, max}) {
    const diff = max.diff(min);
    return {
      from: moment(min).subtract(diff).toISOString(),
      to: min.toISOString()
    };
  },

  zoomOut({min, max}) {
    const diff = max.diff(min);
    return {
      from: moment(min).subtract(diff / 2).toISOString(),
      to: moment(max).add(diff / 2).toISOString()
    };
  },

  zoomIn({min, max}) {
    const diff = max.diff(min);
    return {
      from: moment(min).add(diff / 4).toISOString(),
      to: moment(max).subtract(diff / 4).toISOString()
    };
  }
};
