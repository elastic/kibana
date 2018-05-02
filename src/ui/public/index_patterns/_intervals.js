import _ from 'lodash';
import moment from 'moment';
import { IndexedArray } from '../indexed_array';
import { isNumeric } from '../utils/numeric';

export function IndexPatternsIntervalsProvider(timefilter) {

  const intervals = new IndexedArray({
    index: ['name'],
    initialSet: [
      {
        name: 'hours',
        startOf: 'hour',
        display: 'Hourly'
      },
      {
        name: 'days',
        startOf: 'day',
        display: 'Daily'
      },
      {
        name: 'weeks',
        startOf: 'isoWeek',
        display: 'Weekly'
      },
      {
        name: 'months',
        startOf: 'month',
        display: 'Monthly'
      },
      {
        name: 'years',
        startOf: 'year',
        display: 'Yearly'
      }
    ]
  });

  intervals.toIndexList = function (format, interval, a, b, sortDirection) {
    let bounds;

    // setup the range that the list will span, return two moment objects that
    // are in proper order. a and b can be numbers to specify to go before or after now (respectively)
    // a certain number of times, based on the interval
    const range = [[a, 'min', 'startOf'], [b, 'max', 'startOf']].map(function (v) {
      let val = v[0];
      const bound = v[1];
      const extend = v[2];

      // grab a bound from the time filter
      if (val == null) {
        bounds = bounds || timefilter.getBounds();
        val = bounds[bound];
      }

      if (isNumeric(val)) val = moment().add(val, interval.name);
      else if (!moment.isMoment(val)) val = moment(val);

      return val.clone().utc()[extend](interval.startOf);
    }).sort(function (a, b) {
      return a - b;
    });

    if (typeof interval === 'string') {
      interval = _.find(intervals, { name: interval });
      if (!interval) throw new Error('Interval must be one of ' + _.pluck(intervals, 'name'));
    }

    const indexList = [];
    let start = range.shift();
    // turn stop into milliseconds to that it's not constantly converted by the while condition
    const stop = range.shift().valueOf();

    const add = sortDirection === 'desc' ? 'unshift' : 'push';

    while (start <= stop) {
      const index = start.format(format);
      const next = moment(start).add(1, interval.name);
      const bound = moment(next).subtract(1, 'ms');

      const min = start.valueOf();
      const max = bound.valueOf();
      indexList[add]({
        index: index,
        min: min,
        max: max
      });

      start = next;
    }

    return indexList;
  };

  return intervals;
}
