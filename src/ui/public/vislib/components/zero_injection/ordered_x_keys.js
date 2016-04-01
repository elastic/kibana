define(function (require) {
  return function OrderedXKeysUtilService(Private) {
    let _ = require('lodash');
    let moment = require('moment');
    let getUniqKeys = Private(require('ui/vislib/components/zero_injection/uniq_keys'));

    /*
     * Accepts a Kibana data object and returns
     * an array of x axis values.
     * values sorted by timestamp if isDate and Date Histogram agg
     * else values sorted by index
     */

    return function (obj) {
      if (!_.isObject(obj)) {
        throw new Error('OrderedXKeysUtilService expects an object');
      }

      let uniqKeys = getUniqKeys(obj);
      let uniqKeysPairs = [...uniqKeys.entries()];

      let interval = _.get(obj, 'ordered.interval');
      let dateInterval = moment.isDuration(interval) ? interval : false;

      return _(uniqKeysPairs)
      .sortBy(function (d) {
        if (d[1].isDate || d[1].isOrdered) {
          return +d[0];
        }
        return d[1].index;
      })
      .map(function (d, i, list) {
        if (!d[1].isNumber) return d[0];

        let val = +d[0];
        if (interval == null) return val;

        let gapEdge = parseFloat(_.get(list, [i + 1, 0]));
        if (isNaN(gapEdge)) return val;

        let vals = [];
        let next = val;

        if (dateInterval) {
          next = moment(val);
          while (next < gapEdge) {
            vals.push(next.valueOf());
            next.add(dateInterval);
          }
        } else {
          while (next < gapEdge) {
            vals.push(next);
            next += interval;
          }
        }

        return vals;
      })
      .flatten()
      .value();
    };
  };
});
