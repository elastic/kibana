/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import moment from 'moment';

import { timeBucketsCalcAutoIntervalProvider } from '../calc_auto_interval';

describe('ML - calc auto intervals', () => {
  const calcAuto = timeBucketsCalcAutoIntervalProvider();

  describe('near interval', () => {
    it('returns 0ms buckets for undefined / 0 bars', () => {
      const interval = calcAuto.near(0, undefined);
      expect(interval.asMilliseconds()).to.be(0);
    });

    it('returns 1000ms buckets for 60s / 100 bars', () => {
      const interval = calcAuto.near(100, moment.duration(60, 's'));
      expect(interval.asMilliseconds()).to.be(1000);
    });

    it('returns 5m buckets for 8h / 100 bars', () => {
      const interval = calcAuto.near(100, moment.duration(8, 'h'));
      expect(interval.asMinutes()).to.be(5);
    });

    it('returns 15m buckets for 1d / 100 bars', () => {
      const interval = calcAuto.near(100, moment.duration(1, 'd'));
      expect(interval.asMinutes()).to.be(15);
    });

    it('returns 1h buckets for 20d / 500 bars', () => {
      const interval = calcAuto.near(500, moment.duration(20, 'd'));
      expect(interval.asHours()).to.be(1);
    });

    it('returns 6h buckets for 100d / 500 bars', () => {
      const interval = calcAuto.near(500, moment.duration(100, 'd'));
      expect(interval.asHours()).to.be(6);
    });

    it('returns 24h buckets for 1y / 500 bars', () => {
      const interval = calcAuto.near(500, moment.duration(1, 'y'));
      expect(interval.asHours()).to.be(24);
    });

    it('returns 12h buckets for 1y / 1000 bars', () => {
      const interval = calcAuto.near(1000, moment.duration(1, 'y'));
      expect(interval.asHours()).to.be(12);
    });
  });

  describe('lessThan interval', () => {
    it('returns 0ms buckets for undefined / 0 bars', () => {
      const interval = calcAuto.lessThan(0, undefined);
      expect(interval.asMilliseconds()).to.be(0);
    });

    it('returns 500ms buckets for 60s / 100 bars', () => {
      const interval = calcAuto.lessThan(100, moment.duration(60, 's'));
      expect(interval.asMilliseconds()).to.be(500);
    });

    it('returns 5m buckets for 8h / 100 bars', () => {
      const interval = calcAuto.lessThan(100, moment.duration(8, 'h'));
      expect(interval.asMinutes()).to.be(5);
    });

    it('returns 30m buckets for 1d / 100 bars', () => {
      const interval = calcAuto.lessThan(100, moment.duration(1, 'd'));
      expect(interval.asMinutes()).to.be(30);
    });

    it('returns 1h buckets for 20d / 500 bars', () => {
      const interval = calcAuto.lessThan(500, moment.duration(20, 'd'));
      expect(interval.asHours()).to.be(1);
    });

    it('returns 6h buckets for 100d / 500 bars', () => {
      const interval = calcAuto.lessThan(500, moment.duration(100, 'd'));
      expect(interval.asHours()).to.be(6);
    });

    it('returns 24h buckets for 1y / 500 bars', () => {
      const interval = calcAuto.lessThan(500, moment.duration(1, 'y'));
      expect(interval.asHours()).to.be(24);
    });

    it('returns 12h buckets for 1y / 1000 bars', () => {
      const interval = calcAuto.lessThan(1000, moment.duration(1, 'y'));
      expect(interval.asHours()).to.be(12);
    });
  });

  describe('atLeast interval', () => {
    it('returns 0ms buckets for undefined / 0 bars', () => {
      const interval = calcAuto.atLeast(0, undefined);
      expect(interval.asMilliseconds()).to.be(0);
    });

    it('returns 100ms buckets for 60s / 100 bars', () => {
      const interval = calcAuto.atLeast(100, moment.duration(60, 's'));
      expect(interval.asMilliseconds()).to.be(100);
    });

    it('returns 1m buckets for 8h / 100 bars', () => {
      const interval = calcAuto.atLeast(100, moment.duration(8, 'h'));
      expect(interval.asMinutes()).to.be(1);
    });

    it('returns 10m buckets for 1d / 100 bars', () => {
      const interval = calcAuto.atLeast(100, moment.duration(1, 'd'));
      expect(interval.asMinutes()).to.be(10);
    });

    it('returns 30m buckets for 20d / 500 bars', () => {
      const interval = calcAuto.atLeast(500, moment.duration(20, 'd'));
      expect(interval.asMinutes()).to.be(30);
    });

    it('returns 4h buckets for 100d / 500 bars', () => {
      const interval = calcAuto.atLeast(500, moment.duration(100, 'd'));
      expect(interval.asHours()).to.be(4);
    });

    it('returns 12h buckets for 1y / 500 bars', () => {
      const interval = calcAuto.atLeast(500, moment.duration(1, 'y'));
      expect(interval.asHours()).to.be(12);
    });

    it('returns 8h buckets for 1y / 1000 bars', () => {
      const interval = calcAuto.atLeast(1000, moment.duration(1, 'y'));
      expect(interval.asHours()).to.be(8);
    });
  });
});
