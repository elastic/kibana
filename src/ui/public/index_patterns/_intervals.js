/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import moment from 'moment';
import { IndexedArray } from '../indexed_array';
import { isNumeric } from '../utils/numeric';
import { timefilter } from 'ui/timefilter';
import { i18n } from '@kbn/i18n';

export function IndexPatternsIntervalsProvider() {

  const intervals = new IndexedArray({
    index: ['name'],
    initialSet: [
      {
        name: 'hours',
        startOf: 'hour',
        display: i18n.translate('common.ui.indexPattern.intervals.hourlyHeader', { defaultMessage: 'Hourly' })
      },
      {
        name: 'days',
        startOf: 'day',
        display: i18n.translate('common.ui.indexPattern.intervals.dailyHeader', { defaultMessage: 'Daily' })
      },
      {
        name: 'weeks',
        startOf: 'isoWeek',
        display: i18n.translate('common.ui.indexPattern.intervals.weeklyHeader', { defaultMessage: 'Weekly' })
      },
      {
        name: 'months',
        startOf: 'month',
        display: i18n.translate('common.ui.indexPattern.intervals.monthlyHeader', { defaultMessage: 'Monthly' })
      },
      {
        name: 'years',
        startOf: 'year',
        display: i18n.translate('common.ui.indexPattern.intervals.yearlyHeader', { defaultMessage: 'Yearly' })
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
      if (!interval) {
        const errorMessage = i18n.translate('common.ui.indexPattern.intervalsErrorMessage',
          { values: { intervals: _.pluck(intervals, 'name') }, defaultMessage: 'Interval must be one of {intervals}' });

        throw new Error(errorMessage);
      }
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
