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

import moment from 'moment';

import { calcAutoIntervalLessThan, calcAutoIntervalNear } from './calc_auto_interval';

describe('calcAutoIntervalNear', () => {
  test('100 buckets/1ms = 1ms buckets', () => {
    const interval = calcAutoIntervalNear(100, moment.duration(1, 'ms'));
    expect(interval.asMilliseconds()).toBe(1);
  });

  test('100 buckets/200ms = 2ms buckets', () => {
    const interval = calcAutoIntervalNear(100, moment.duration(200, 'ms'));
    expect(interval.asMilliseconds()).toBe(2);
  });

  test('1000 buckets/1s = 1ms buckets', () => {
    const interval = calcAutoIntervalNear(1000, moment.duration(1, 's'));
    expect(interval.asMilliseconds()).toBe(1);
  });

  test('1000 buckets/1000h = 1h buckets', () => {
    const interval = calcAutoIntervalNear(1000, moment.duration(1000, 'hours'));
    expect(interval.asHours()).toBe(1);
  });

  test('100 buckets/1h = 30s buckets', () => {
    const interval = calcAutoIntervalNear(100, moment.duration(1, 'hours'));
    expect(interval.asSeconds()).toBe(30);
  });

  test('25 buckets/1d = 1h buckets', () => {
    const interval = calcAutoIntervalNear(25, moment.duration(1, 'day'));
    expect(interval.asHours()).toBe(1);
  });

  test('1000 buckets/1y = 12h buckets', () => {
    const interval = calcAutoIntervalNear(1000, moment.duration(1, 'year'));
    expect(interval.asHours()).toBe(12);
  });

  test('10000 buckets/1y = 1h buckets', () => {
    const interval = calcAutoIntervalNear(10000, moment.duration(1, 'year'));
    expect(interval.asHours()).toBe(1);
  });

  test('100000 buckets/1y = 5m buckets', () => {
    const interval = calcAutoIntervalNear(100000, moment.duration(1, 'year'));
    expect(interval.asMinutes()).toBe(5);
  });
});

describe('calcAutoIntervalLessThan', () => {
  test('100 buckets/1ms = 1ms buckets', () => {
    const interval = calcAutoIntervalLessThan(100, moment.duration(1, 'ms'));
    expect(interval.asMilliseconds()).toBe(1);
  });

  test('100 buckets/200ms = 2ms buckets', () => {
    const interval = calcAutoIntervalLessThan(100, moment.duration(200, 'ms'));
    expect(interval.asMilliseconds()).toBe(2);
  });

  test('1000 buckets/1s = 1ms buckets', () => {
    const interval = calcAutoIntervalLessThan(1000, moment.duration(1, 's'));
    expect(interval.asMilliseconds()).toBe(1);
  });

  test('1000 buckets/1000h = 1h buckets', () => {
    const interval = calcAutoIntervalLessThan(1000, moment.duration(1000, 'hours'));
    expect(interval.asHours()).toBe(1);
  });

  test('100 buckets/1h = 30s buckets', () => {
    const interval = calcAutoIntervalLessThan(100, moment.duration(1, 'hours'));
    expect(interval.asSeconds()).toBe(30);
  });

  test('25 buckets/1d = 30m buckets', () => {
    const interval = calcAutoIntervalLessThan(25, moment.duration(1, 'day'));
    expect(interval.asMinutes()).toBe(30);
  });

  test('1000 buckets/1y = 3h buckets', () => {
    const interval = calcAutoIntervalLessThan(1000, moment.duration(1, 'year'));
    expect(interval.asHours()).toBe(3);
  });

  test('10000 buckets/1y = 30m buckets', () => {
    const interval = calcAutoIntervalLessThan(10000, moment.duration(1, 'year'));
    expect(interval.asMinutes()).toBe(30);
  });

  test('100000 buckets/1y = 5m buckets', () => {
    const interval = calcAutoIntervalLessThan(100000, moment.duration(1, 'year'));
    expect(interval.asMinutes()).toBe(5);
  });
});
