/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 ** Applying the same logic as:
 ** x-pack/legacy/plugins/apm/server/lib/helpers/get_bucket_size/calculate_auto.js
 */
import moment from 'moment';
import { get } from 'lodash/fp';
const d = moment.duration;

const roundingRules = [
  [d(500, 'ms'), d(100, 'ms')],
  [d(5, 'second'), d(1, 'second')],
  [d(7.5, 'second'), d(5, 'second')],
  [d(15, 'second'), d(10, 'second')],
  [d(45, 'second'), d(30, 'second')],
  [d(3, 'minute'), d(1, 'minute')],
  [d(9, 'minute'), d(5, 'minute')],
  [d(20, 'minute'), d(10, 'minute')],
  [d(45, 'minute'), d(30, 'minute')],
  [d(2, 'hour'), d(1, 'hour')],
  [d(6, 'hour'), d(3, 'hour')],
  [d(24, 'hour'), d(12, 'hour')],
  [d(1, 'week'), d(1, 'd')],
  [d(3, 'week'), d(1, 'week')],
  [d(1, 'year'), d(1, 'month')],
  [Infinity, d(1, 'year')],
];

const revRoundingRules = roundingRules.slice(0).reverse();

const find = (
  rules: Array<Array<number | moment.Duration>>,
  check: (
    bound: number | moment.Duration,
    interval: number | moment.Duration,
    target: number
  ) => number | moment.Duration | undefined,
  last?: boolean
): ((buckets: number, duration: number | moment.Duration) => moment.Duration | undefined) => {
  const pick = (buckets: number, duration: number | moment.Duration): number | moment.Duration => {
    const target =
      typeof duration === 'number' ? duration / buckets : duration.asMilliseconds() / buckets;
    let lastResp = null;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const resp = check(rule[0], rule[1], target);

      if (resp == null) {
        if (last) {
          if (lastResp) return lastResp;
          break;
        }
      }

      if (!last && resp) return resp;
      lastResp = resp;
    }

    // fallback to just a number of milliseconds, ensure ms is >= 1
    const ms = Math.max(Math.floor(target), 1);
    return moment.duration(ms, 'ms');
  };

  return (buckets, duration) => {
    const interval = pick(buckets, duration);
    const intervalData = get('_data', interval);
    if (intervalData) return moment.duration(intervalData);
  };
};

export const calculateAuto = {
  near: find(
    revRoundingRules,
    (bound, interval, target) => {
      if (bound > target) return interval;
    },
    true
  ),
  lessThan: find(revRoundingRules, (_bound, interval, target) => {
    if (interval < target) return interval;
  }),
  atLeast: find(revRoundingRules, (_bound, interval, target) => {
    if (interval <= target) return interval;
  }),
};

export const calculateTimeseriesInterval = (
  lowerBoundInMsSinceEpoch: number,
  upperBoundInMsSinceEpoch: number
) => {
  const duration = moment.duration(upperBoundInMsSinceEpoch - lowerBoundInMsSinceEpoch, 'ms');

  const matchedInterval = calculateAuto.near(50, duration);

  return matchedInterval ? Math.max(matchedInterval.asSeconds(), 1) : null;
};
