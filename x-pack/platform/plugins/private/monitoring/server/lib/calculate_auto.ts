/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Duration } from 'moment';

type RoundingRule = [number | Duration, Duration];

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
] as RoundingRule[];

function find(
  rules: RoundingRule[],
  check: (b: number | Duration, i: Duration, t: number) => Duration | void
) {
  function pick(buckets?: number, duration?: Duration): Duration {
    if (!buckets || !duration) return moment.duration(0);
    const target = duration.asMilliseconds() / buckets;
    let lastResp;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const resp = check(rule[0], rule[1], target);

      if (resp === null || resp === undefined) {
        if (lastResp) {
          return lastResp;
        }
        break;
      }

      lastResp = resp;
    }

    // fallback to just a number of milliseconds, ensure ms is >= 1
    const ms = Math.max(Math.floor(target), 1);
    return moment.duration(ms, 'ms');
  }

  return function (buckets: number, duration: Duration) {
    const interval = pick(buckets, duration);
    return interval;
  };
}

const revRoundingRules = roundingRules.slice(0).reverse();

/*
 * 24 hours: 600 seconds
 * 12 hours: 300 seconds
 * 4 hours: 60 seconds
 * 1 hour: 30 seconds
 * 15 minutes: 10 seconds
 */
export const calculateAuto = find(revRoundingRules, (bound, interval, target) => {
  // @ts-expect-error upgrade typescript v5.1.6
  if (bound > target) {
    return interval;
  }
});
