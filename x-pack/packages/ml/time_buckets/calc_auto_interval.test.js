/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { timeBucketsCalcAutoIntervalProvider } from './calc_auto_interval';

describe('ML - calc auto intervals', () => {
  const calcAuto = timeBucketsCalcAutoIntervalProvider();

  describe('near interval', () => {
    test('returns 0ms buckets for undefined / 0 bars', () => {
      const interval = calcAuto.near(0, undefined);
      expect(interval.asMilliseconds()).toBe(0);
    });

    test('returns 1000ms buckets for 60s / 100 bars', () => {
      const interval = calcAuto.near(100, moment.duration(60, 's'));
      expect(interval.asMilliseconds()).toBe(1000);
    });

    test('returns 5m buckets for 8h / 100 bars', () => {
      const interval = calcAuto.near(100, moment.duration(8, 'h'));
      expect(interval.asMinutes()).toBe(5);
    });

    test('returns 15m buckets for 1d / 100 bars', () => {
      const interval = calcAuto.near(100, moment.duration(1, 'd'));
      expect(interval.asMinutes()).toBe(15);
    });

    test('returns 1h buckets for 20d / 500 bars', () => {
      const interval = calcAuto.near(500, moment.duration(20, 'd'));
      expect(interval.asHours()).toBe(1);
    });

    test('returns 6h buckets for 100d / 500 bars', () => {
      const interval = calcAuto.near(500, moment.duration(100, 'd'));
      expect(interval.asHours()).toBe(6);
    });

    test('returns 24h buckets for 1y / 500 bars', () => {
      const interval = calcAuto.near(500, moment.duration(1, 'y'));
      expect(interval.asHours()).toBe(24);
    });

    test('returns 12h buckets for 1y / 1000 bars', () => {
      const interval = calcAuto.near(1000, moment.duration(1, 'y'));
      expect(interval.asHours()).toBe(12);
    });
  });

  describe('lessThan interval', () => {
    test('returns 0ms buckets for undefined / 0 bars', () => {
      const interval = calcAuto.lessThan(0, undefined);
      expect(interval.asMilliseconds()).toBe(0);
    });

    test('returns 500ms buckets for 60s / 100 bars', () => {
      const interval = calcAuto.lessThan(100, moment.duration(60, 's'));
      expect(interval.asMilliseconds()).toBe(500);
    });

    test('returns 5m buckets for 8h / 100 bars', () => {
      const interval = calcAuto.lessThan(100, moment.duration(8, 'h'));
      expect(interval.asMinutes()).toBe(5);
    });

    test('returns 30m buckets for 1d / 100 bars', () => {
      const interval = calcAuto.lessThan(100, moment.duration(1, 'd'));
      expect(interval.asMinutes()).toBe(30);
    });

    test('returns 1h buckets for 20d / 500 bars', () => {
      const interval = calcAuto.lessThan(500, moment.duration(20, 'd'));
      expect(interval.asHours()).toBe(1);
    });

    test('returns 6h buckets for 100d / 500 bars', () => {
      const interval = calcAuto.lessThan(500, moment.duration(100, 'd'));
      expect(interval.asHours()).toBe(6);
    });

    test('returns 24h buckets for 1y / 500 bars', () => {
      const interval = calcAuto.lessThan(500, moment.duration(1, 'y'));
      expect(interval.asHours()).toBe(24);
    });

    test('returns 12h buckets for 1y / 1000 bars', () => {
      const interval = calcAuto.lessThan(1000, moment.duration(1, 'y'));
      expect(interval.asHours()).toBe(12);
    });
  });

  describe('atLeast interval', () => {
    test('returns 0ms buckets for undefined / 0 bars', () => {
      const interval = calcAuto.atLeast(0, undefined);
      expect(interval.asMilliseconds()).toBe(0);
    });

    test('returns 100ms buckets for 60s / 100 bars', () => {
      const interval = calcAuto.atLeast(100, moment.duration(60, 's'));
      expect(interval.asMilliseconds()).toBe(100);
    });

    test('returns 1m buckets for 8h / 100 bars', () => {
      const interval = calcAuto.atLeast(100, moment.duration(8, 'h'));
      expect(interval.asMinutes()).toBe(1);
    });

    test('returns 10m buckets for 1d / 100 bars', () => {
      const interval = calcAuto.atLeast(100, moment.duration(1, 'd'));
      expect(interval.asMinutes()).toBe(10);
    });

    test('returns 30m buckets for 20d / 500 bars', () => {
      const interval = calcAuto.atLeast(500, moment.duration(20, 'd'));
      expect(interval.asMinutes()).toBe(30);
    });

    test('returns 4h buckets for 100d / 500 bars', () => {
      const interval = calcAuto.atLeast(500, moment.duration(100, 'd'));
      expect(interval.asHours()).toBe(4);
    });

    test('returns 12h buckets for 1y / 500 bars', () => {
      const interval = calcAuto.atLeast(500, moment.duration(1, 'y'));
      expect(interval.asHours()).toBe(12);
    });

    test('returns 8h buckets for 1y / 1000 bars', () => {
      const interval = calcAuto.atLeast(1000, moment.duration(1, 'y'));
      expect(interval.asHours()).toBe(8);
    });
  });
});
