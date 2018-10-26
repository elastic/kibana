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

import moment, { Duration } from 'moment';

const rules = [
  {
    bound: Infinity,
    interval: moment.duration(1, 'year'),
  },
  {
    bound: moment.duration(1, 'year'),
    interval: moment.duration(1, 'month'),
  },
  {
    bound: moment.duration(3, 'week'),
    interval: moment.duration(1, 'week'),
  },
  {
    bound: moment.duration(1, 'week'),
    interval: moment.duration(1, 'd'),
  },
  {
    bound: moment.duration(24, 'hour'),
    interval: moment.duration(12, 'hour'),
  },
  {
    bound: moment.duration(6, 'hour'),
    interval: moment.duration(3, 'hour'),
  },
  {
    bound: moment.duration(2, 'hour'),
    interval: moment.duration(1, 'hour'),
  },
  {
    bound: moment.duration(45, 'minute'),
    interval: moment.duration(30, 'minute'),
  },
  {
    bound: moment.duration(20, 'minute'),
    interval: moment.duration(10, 'minute'),
  },
  {
    bound: moment.duration(9, 'minute'),
    interval: moment.duration(5, 'minute'),
  },
  {
    bound: moment.duration(3, 'minute'),
    interval: moment.duration(1, 'minute'),
  },
  {
    bound: moment.duration(45, 'second'),
    interval: moment.duration(30, 'second'),
  },
  {
    bound: moment.duration(15, 'second'),
    interval: moment.duration(10, 'second'),
  },
  {
    bound: moment.duration(7.5, 'second'),
    interval: moment.duration(5, 'second'),
  },
  {
    bound: moment.duration(5, 'second'),
    interval: moment.duration(1, 'second'),
  },
  {
    bound: moment.duration(500, 'ms'),
    interval: moment.duration(100, 'ms'),
  },
];

function estimateBucketMs(count: number, duration: Duration) {
  const ms = Number(duration) / count;
  return isFinite(ms) ? ms : NaN;
}

function defaultInterval(targetMs: number) {
  return moment.duration(isNaN(targetMs) ? 0 : Math.max(Math.floor(targetMs), 1), 'ms');
}

/**
 * Using some simple rules we pick a "pretty" interval that will
 * produce around the number of buckets desired given a time range.
 *
 * @param targetBucketCount desired number of buckets
 * @param duration time range the agg covers
 */
export function calcAutoIntervalNear(targetBucketCount: number, duration: Duration) {
  const targetMs = estimateBucketMs(targetBucketCount, duration);

  for (let i = 0; i < rules.length - 1; i++) {
    if (Number(rules[i + 1].bound) <= targetMs) {
      return rules[i].interval.clone();
    }
  }

  return defaultInterval(targetMs);
}

/**
 * Pick a "pretty" interval that produces no more than the maxBucketCount
 * for the given time range.
 *
 * @param maxBucketCount maximum number of buckets to create
 * @param duration amount of time covered by the agg
 */
export function calcAutoIntervalLessThan(maxBucketCount: number, duration: Duration) {
  const maxMs = estimateBucketMs(maxBucketCount, duration);

  for (const { interval } of rules) {
    if (Number(interval) <= maxMs) {
      return interval.clone();
    }
  }

  return defaultInterval(maxMs);
}
