/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import {
  assertValidInterval,
  intervalFromNow,
  intervalFromDate,
  minutesFromNow,
  minutesFromDate,
  secondsFromNow,
  secondsFromDate,
} from './intervals';

let fakeTimer: sinon.SinonFakeTimers;

beforeAll(() => {
  fakeTimer = sinon.useFakeTimers();
});

afterAll(() => fakeTimer.restore());

describe('taskIntervals', () => {
  describe('assertValidInterval', () => {
    test('it accepts intervals in the form `Nm`', () => {
      expect(() => assertValidInterval(`${_.random(1, 1000)}m`)).not.toThrow();
    });

    test('it accepts intervals in the form `Ns`', () => {
      expect(() => assertValidInterval(`${_.random(1, 1000)}s`)).not.toThrow();
    });

    test('it rejects 0 based intervals', () => {
      expect(() => assertValidInterval('0m')).toThrow(
        /Invalid interval "0m"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => assertValidInterval('0s')).toThrow(
        /Invalid interval "0s"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('it rejects intervals are not of the form `Nm` or `Ns`', () => {
      expect(() => assertValidInterval(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => assertValidInterval(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });
  });

  describe('intervalFromNow', () => {
    test('it returns the current date plus n minutes', () => {
      const mins = _.random(1, 100);
      const expected = Date.now() + mins * 60 * 1000;
      const nextRun = intervalFromNow(`${mins}m`)!.getTime();
      expect(nextRun).toEqual(expected);
    });

    test('it returns the current date plus n seconds', () => {
      const secs = _.random(1, 100);
      const expected = Date.now() + secs * 1000;
      const nextRun = intervalFromNow(`${secs}s`)!.getTime();
      expect(nextRun).toEqual(expected);
    });

    test('it rejects intervals are not of the form `Nm` or `Ns`', () => {
      expect(() => intervalFromNow(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromNow(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('it rejects 0 based intervals', () => {
      expect(() => intervalFromNow('0m')).toThrow(
        /Invalid interval "0m"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromNow('0s')).toThrow(
        /Invalid interval "0s"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });
  });

  describe('intervalFromDate', () => {
    test('it returns the given date plus n minutes', () => {
      const originalDate = new Date(2019, 1, 1);
      const mins = _.random(1, 100);
      const expected = originalDate.valueOf() + mins * 60 * 1000;
      const nextRun = intervalFromDate(originalDate, `${mins}m`)!.getTime();
      expect(expected).toEqual(nextRun);
    });

    test('it returns the current date plus n seconds', () => {
      const originalDate = new Date(2019, 1, 1);
      const secs = _.random(1, 100);
      const expected = originalDate.valueOf() + secs * 1000;
      const nextRun = intervalFromDate(originalDate, `${secs}s`)!.getTime();
      expect(expected).toEqual(nextRun);
    });

    test('it rejects intervals are not of the form `Nm` or `Ns`', () => {
      const date = new Date();
      expect(() => intervalFromDate(date, `5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromDate(date, `hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('it rejects 0 based intervals', () => {
      const date = new Date();
      expect(() => intervalFromDate(date, '0m')).toThrow(
        /Invalid interval "0m"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromDate(date, '0s')).toThrow(
        /Invalid interval "0s"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });
  });

  describe('minutesFromNow', () => {
    test('it returns the current date plus a number of minutes', () => {
      const mins = _.random(1, 100);
      const expected = Date.now() + mins * 60 * 1000;
      const nextRun = minutesFromNow(mins).getTime();
      expect(nextRun).toEqual(expected);
    });
  });

  describe('minutesFromDate', () => {
    test('it returns the given date plus a number of minutes', () => {
      const originalDate = new Date(2019, 1, 1);
      const mins = _.random(1, 100);
      const expected = originalDate.valueOf() + mins * 60 * 1000;
      const nextRun = minutesFromDate(originalDate, mins).getTime();
      expect(expected).toEqual(nextRun);
    });
  });

  describe('secondsFromNow', () => {
    test('it returns the current date plus a number of seconds', () => {
      const secs = _.random(1, 100);
      const expected = Date.now() + secs * 1000;
      const nextRun = secondsFromNow(secs).getTime();
      expect(nextRun).toEqual(expected);
    });
  });

  describe('secondsFromDate', () => {
    test('it returns the given date plus a number of seconds', () => {
      const originalDate = new Date(2019, 1, 1);
      const secs = _.random(1, 100);
      const expected = originalDate.valueOf() + secs * 1000;
      const nextRun = secondsFromDate(originalDate, secs).getTime();
      expect(expected).toEqual(nextRun);
    });
  });
});
