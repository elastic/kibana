/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import moment from 'moment';
import {
  MlTimeBuckets,
  getBoundsRoundedToInterval,
  calcEsInterval } from '../ml_time_buckets';

describe('ML - time buckets', () => {

  let autoBuckets;
  let customBuckets;

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(() => {

      autoBuckets = new MlTimeBuckets();
      autoBuckets.setInterval('auto');

      customBuckets = new MlTimeBuckets();
      customBuckets.setInterval('auto');
      customBuckets.setBarTarget(500);
      customBuckets.setMaxBars(550);
    });
  });

  describe('default bar target', () => {

    it('returns correct interval for default target with hour bounds', () => {
      const hourBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-01T01:00:00.000') };
      autoBuckets.setBounds(hourBounds);
      const hourResult = autoBuckets.getInterval();
      expect(hourResult.asSeconds()).to.be(60);      // 1 minute
    });

    it('returns correct interval for default target with day bounds', () => {
      const dayBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-02T00:00:00.000') };
      autoBuckets.setBounds(dayBounds);
      const dayResult = autoBuckets.getInterval();
      expect(dayResult.asSeconds()).to.be(1800);    // 30 minutes
    });

    it('returns correct interval for default target with week bounds', () => {
      const weekBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-08T00:00:00.000') };
      autoBuckets.setBounds(weekBounds);
      const weekResult = autoBuckets.getInterval();
      expect(weekResult.asSeconds()).to.be(14400);  // 4 hours
    });

    it('returns correct interval for default target with 30 day bounds', () => {
      const monthBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-31T00:00:00.000') };
      autoBuckets.setBounds(monthBounds);
      const monthResult = autoBuckets.getInterval();
      expect(monthResult.asSeconds()).to.be(86400); // 1 day
    });

    it('returns correct interval for default target with year bounds', () => {
      const yearBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2018-01-01T00:00:00.000') };
      autoBuckets.setBounds(yearBounds);
      const yearResult = autoBuckets.getInterval();
      expect(yearResult.asSeconds()).to.be(604800); // 1 week
    });

    it('returns correct interval as multiple of 3 hours for default target with 2 week bounds', () => {
      const weekBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-15T00:00:00.000') };
      autoBuckets.setBounds(weekBounds);
      const weekResult = autoBuckets.getIntervalToNearestMultiple(10800); // 3 hours
      expect(weekResult.asSeconds()).to.be(32400);  // 9 hours
    });

  });

  describe('custom bar target', () => {

    it('returns correct interval for 500 bar target with hour bounds', () => {
      const hourBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-01T01:00:00.000') };
      customBuckets.setBounds(hourBounds);
      const hourResult = customBuckets.getInterval();
      expect(hourResult.asSeconds()).to.be(10);      // 10 seconds
    });

    it('returns correct interval for 500 bar target with day bounds', () => {
      const dayBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-02T00:00:00.000') };
      customBuckets.setBounds(dayBounds);
      const dayResult = customBuckets.getInterval();
      expect(dayResult.asSeconds()).to.be(300);    // 5 minutes
    });

    it('returns correct interval for 500 bar target with week bounds', () => {
      const weekBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-08T00:00:00.000') };
      customBuckets.setBounds(weekBounds);
      const weekResult = customBuckets.getInterval();
      expect(weekResult.asSeconds()).to.be(1800);  // 30 minutes
    });

    it('returns correct interval for 500 bar target with 30 day bounds', () => {
      const monthBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-01-31T00:00:00.000') };
      customBuckets.setBounds(monthBounds);
      const monthResult = customBuckets.getInterval();
      expect(monthResult.asSeconds()).to.be(7200); // 2 hours
    });

    it('returns correct interval for 500 bar target with year bounds', () => {
      const yearBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2018-01-01T00:00:00.000') };
      customBuckets.setBounds(yearBounds);
      const yearResult = customBuckets.getInterval();
      expect(yearResult.asSeconds()).to.be(86400); // 1 day
    });

    it('returns correct interval as multiple of 3 hours for 500 bar target with 90 day bounds', () => {
      const weekBounds = { min: moment('2017-01-01T00:00:00.000'), max: moment('2017-04-01T00:00:00.000') };
      customBuckets.setBounds(weekBounds);
      const weekResult = customBuckets.getIntervalToNearestMultiple(10800); // 3 hours
      expect(weekResult.asSeconds()).to.be(21600);  // 6 hours
    });

  });

  describe('getBoundsRoundedToInterval', () => {
    // Must include timezone when creating moments for this test to ensure
    // checks are correct when running tests in different timezones.
    const testBounds = { min: moment('2017-01-05T10:11:12.000+00:00'), max: moment('2017-10-26T09:08:07.000+00:00') };

    it('returns correct bounds for 4h interval without inclusive end', () => {
      const bounds4h = getBoundsRoundedToInterval (testBounds, moment.duration(4, 'hours'), false);
      expect(bounds4h.min.valueOf()).to.be(moment('2017-01-05T08:00:00.000+00:00').valueOf());
      expect(bounds4h.max.valueOf()).to.be(moment('2017-10-26T11:59:59.999+00:00').valueOf());
    });

    it('returns correct bounds for 4h interval with inclusive end', () => {
      const bounds4h = getBoundsRoundedToInterval (testBounds, moment.duration(4, 'hours'), true);
      expect(bounds4h.min.valueOf()).to.be(moment('2017-01-05T08:00:00.000+00:00').valueOf());
      expect(bounds4h.max.valueOf()).to.be(moment('2017-10-26T12:00:00.000+00:00').valueOf());
    });

    it('returns correct bounds for 1d interval without inclusive end', () => {
      const bounds4h = getBoundsRoundedToInterval (testBounds, moment.duration(1, 'days'), false);
      expect(bounds4h.min.valueOf()).to.be(moment('2017-01-05T00:00:00.000+00:00').valueOf());
      expect(bounds4h.max.valueOf()).to.be(moment('2017-10-26T23:59:59.999+00:00').valueOf());
    });

    it('returns correct bounds for 1d interval with inclusive end', () => {
      const bounds4h = getBoundsRoundedToInterval (testBounds, moment.duration(1, 'days'), true);
      expect(bounds4h.min.valueOf()).to.be(moment('2017-01-05T00:00:00.000+00:00').valueOf());
      expect(bounds4h.max.valueOf()).to.be(moment('2017-10-27T00:00:00.000+00:00').valueOf());
    });

  });

  describe('calcEsInterval', () => {
    it('returns correct interval for various durations', () => {
      expect(calcEsInterval(moment.duration(500, 'ms'))).to.eql({ value: 500, unit: 'ms', expression: '500ms' });
      expect(calcEsInterval(moment.duration(1000, 'ms'))).to.eql({ value: 1, unit: 's', expression: '1s' });
      expect(calcEsInterval(moment.duration(15, 's'))).to.eql({ value: 15, unit: 's', expression: '15s' });
      expect(calcEsInterval(moment.duration(60, 's'))).to.eql({ value: 1, unit: 'm', expression: '1m' });
      expect(calcEsInterval(moment.duration(1, 'm'))).to.eql({ value: 1, unit: 'm', expression: '1m' });
      expect(calcEsInterval(moment.duration(60, 'm'))).to.eql({ value: 1, unit: 'h', expression: '1h' });
      expect(calcEsInterval(moment.duration(3, 'h'))).to.eql({ value: 3, unit: 'h', expression: '3h' });
      expect(calcEsInterval(moment.duration(24, 'h'))).to.eql({ value: 1, unit: 'd', expression: '1d' });
      expect(calcEsInterval(moment.duration(3, 'd'))).to.eql({ value: 3, unit: 'd', expression: '3d' });
      expect(calcEsInterval(moment.duration(7, 'd'))).to.eql({ value: 1, unit: 'w', expression: '1w' });
      expect(calcEsInterval(moment.duration(1, 'w'))).to.eql({ value: 1, unit: 'w', expression: '1w' });
      expect(calcEsInterval(moment.duration(4, 'w'))).to.eql({ value: 28, unit: 'd', expression: '28d' });
      expect(calcEsInterval(moment.duration(1, 'M'))).to.eql({ value: 1, unit: 'M', expression: '1M' });
      expect(calcEsInterval(moment.duration(12, 'M'))).to.eql({ value: 1, unit: 'y', expression: '1y' });
      expect(calcEsInterval(moment.duration(1, 'y'))).to.eql({ value: 1, unit: 'y', expression: '1y' });
    });
  });

});
