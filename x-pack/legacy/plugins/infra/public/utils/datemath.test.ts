/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidDatemath, datemathToEpochMillis, extendDatemath, convertDate } from './datemath';
import sinon from 'sinon';

describe('isValidDatemath()', () => {
  it('Returns `false` for empty strings', () => {
    expect(isValidDatemath('')).toBe(false);
  });

  it('Returns `false` for invalid strings', () => {
    expect(isValidDatemath('wadus')).toBe(false);
    expect(isValidDatemath('nowww-')).toBe(false);
    expect(isValidDatemath('now-')).toBe(false);
    expect(isValidDatemath('now-1')).toBe(false);
    expect(isValidDatemath('now-1d/')).toBe(false);
  });

  it('Returns `true` for valid strings', () => {
    expect(isValidDatemath('now')).toBe(true);
    expect(isValidDatemath('now-1d')).toBe(true);
    expect(isValidDatemath('now-1d/d')).toBe(true);
  });
});

describe('datemathToEpochMillis()', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(Date.now());
  });

  afterEach(() => {
    clock.restore();
  });

  it('Returns `0` for the dawn of time', () => {
    expect(datemathToEpochMillis('1970-01-01T00:00:00+00:00')).toEqual(0);
  });

  it('Returns the current timestamp when `now`', () => {
    expect(datemathToEpochMillis('now')).toEqual(Date.now());
  });
});

describe('extendDatemath()', () => {
  it('Returns `undefined` for invalid values', () => {
    expect(extendDatemath('')).toBeUndefined();
  });

  it('Keeps `"now"` stable', () => {
    expect(extendDatemath('now')).toEqual({ value: 'now' });
    expect(extendDatemath('now', 'before')).toEqual({ value: 'now' });
    expect(extendDatemath('now', 'after')).toEqual({ value: 'now' });
  });

  describe('moving before', () => {
    describe('with a negative operator', () => {
      it('doubles miliseconds', () => {
        expect(extendDatemath('now-250ms')).toEqual({
          value: 'now-500ms',
          diffAmount: 250,
          diffUnit: 'ms',
        });
      });

      it('doubles seconds', () => {
        expect(extendDatemath('now-10s')).toEqual({
          value: 'now-20s',
          diffAmount: 10,
          diffUnit: 's',
        });
      });

      it('doubles minutes when amount is low', () => {
        expect(extendDatemath('now-1m')).toEqual({ value: 'now-2m', diffAmount: 1, diffUnit: 'm' });
        expect(extendDatemath('now-2m')).toEqual({ value: 'now-4m', diffAmount: 2, diffUnit: 'm' });
        expect(extendDatemath('now-3m')).toEqual({ value: 'now-6m', diffAmount: 3, diffUnit: 'm' });
      });

      it('adds half the minutes when the amount is high', () => {
        expect(extendDatemath('now-20m')).toEqual({
          value: 'now-30m',
          diffAmount: 10,
          diffUnit: 'm',
        });
      });

      it('Adds half an hour when the amount is one hour', () => {
        expect(extendDatemath('now-1h')).toEqual({
          value: 'now-90m',
          diffAmount: 30,
          diffUnit: 'm',
        });
      });

      it('Adds one hour when the amount more than one hour', () => {
        expect(extendDatemath('now-2h')).toEqual({
          value: 'now-3h',
          diffAmount: 1,
          diffUnit: 'h',
        });
      });

      it('Adds one hour when the amount is one day', () => {
        expect(extendDatemath('now-1d')).toEqual({
          value: 'now-25h',
          diffAmount: 1,
          diffUnit: 'h',
        });
      });

      it('Adds one day when the amount is more than one day', () => {
        expect(extendDatemath('now-2d')).toEqual({
          value: 'now-3d',
          diffAmount: 1,
          diffUnit: 'd',
        });
        expect(extendDatemath('now-3d')).toEqual({
          value: 'now-4d',
          diffAmount: 1,
          diffUnit: 'd',
        });
      });

      it('Adds one day when the amount is one week', () => {
        expect(extendDatemath('now-1w')).toEqual({
          value: 'now-8d',
          diffAmount: 1,
          diffUnit: 'd',
        });
      });

      it('Adds one week when the amount is more than one week', () => {
        expect(extendDatemath('now-2w')).toEqual({
          value: 'now-3w',
          diffAmount: 1,
          diffUnit: 'w',
        });
      });

      it('Adds one week when the amount is one month', () => {
        expect(extendDatemath('now-1M')).toEqual({
          value: 'now-5w',
          diffAmount: 1,
          diffUnit: 'w',
        });
      });

      it('Adds one month when the amount is more than one month', () => {
        expect(extendDatemath('now-2M')).toEqual({
          value: 'now-3M',
          diffAmount: 1,
          diffUnit: 'M',
        });
      });

      it('Adds one month when the amount is one year', () => {
        expect(extendDatemath('now-1y')).toEqual({
          value: 'now-13M',
          diffAmount: 1,
          diffUnit: 'M',
        });
      });

      it('Adds one year when the amount is in years', () => {
        expect(extendDatemath('now-2y')).toEqual({
          value: 'now-3y',
          diffAmount: 1,
          diffUnit: 'y',
        });
      });
    });

    describe('with a positive Operator', () => {
      it('Halves miliseconds', () => {
        expect(extendDatemath('now+250ms')).toEqual({
          value: 'now+125ms',
          diffAmount: 125,
          diffUnit: 'ms',
        });
      });

      it('Halves seconds', () => {
        expect(extendDatemath('now+10s')).toEqual({
          value: 'now+5s',
          diffAmount: 5,
          diffUnit: 's',
        });
      });

      it('Halves minutes when the amount is low', () => {
        expect(extendDatemath('now+2m')).toEqual({ value: 'now+1m', diffAmount: 1, diffUnit: 'm' });
        expect(extendDatemath('now+4m')).toEqual({ value: 'now+2m', diffAmount: 2, diffUnit: 'm' });
        expect(extendDatemath('now+6m')).toEqual({ value: 'now+3m', diffAmount: 3, diffUnit: 'm' });
      });

      it('Decreases minutes in half ammounts when the amount is high', () => {
        expect(extendDatemath('now+30m')).toEqual({
          value: 'now+20m',
          diffAmount: 10,
          diffUnit: 'm',
        });
      });

      it('Decreases half an hour when the amount is one hour', () => {
        expect(extendDatemath('now+1h')).toEqual({
          value: 'now+30m',
          diffAmount: 30,
          diffUnit: 'm',
        });
      });

      it('Removes one hour when the amount is one day', () => {
        expect(extendDatemath('now+1d')).toEqual({
          value: 'now+23h',
          diffAmount: 1,
          diffUnit: 'h',
        });
      });

      it('Removes one day when the amount is more than one day', () => {
        expect(extendDatemath('now+2d')).toEqual({
          value: 'now+1d',
          diffAmount: 1,
          diffUnit: 'd',
        });
        expect(extendDatemath('now+3d')).toEqual({
          value: 'now+2d',
          diffAmount: 1,
          diffUnit: 'd',
        });
      });

      it('Removes one day when the amount is one week', () => {
        expect(extendDatemath('now+1w')).toEqual({
          value: 'now+6d',
          diffAmount: 1,
          diffUnit: 'd',
        });
      });

      it('Removes one week when the amount is more than one week', () => {
        expect(extendDatemath('now+2w')).toEqual({
          value: 'now+1w',
          diffAmount: 1,
          diffUnit: 'w',
        });
      });

      it('Removes one week when the amount is one month', () => {
        expect(extendDatemath('now+1M')).toEqual({
          value: 'now+3w',
          diffAmount: 1,
          diffUnit: 'w',
        });
      });

      it('Removes one month when the amount is more than one month', () => {
        expect(extendDatemath('now+2M')).toEqual({
          value: 'now+1M',
          diffAmount: 1,
          diffUnit: 'M',
        });
      });

      it('Removes one month when the amount is one year', () => {
        expect(extendDatemath('now+1y')).toEqual({
          value: 'now+11M',
          diffAmount: 1,
          diffUnit: 'M',
        });
      });

      it('Adds one year when the amount is in years', () => {
        expect(extendDatemath('now+2y')).toEqual({
          value: 'now+1y',
          diffAmount: 1,
          diffUnit: 'y',
        });
      });
    });
  });
});

describe('convertDate()', () => {
  it('returns same value if units are the same', () => {
    expect(convertDate(1, 'h', 'h')).toEqual(1);
  });

  it('converts from big units to small units', () => {
    expect(convertDate(1, 's', 'ms')).toEqual(1000);
    expect(convertDate(1, 'm', 'ms')).toEqual(60000);
    expect(convertDate(1, 'h', 'ms')).toEqual(3600000);
    expect(convertDate(1, 'd', 'ms')).toEqual(86400000);
    expect(convertDate(1, 'M', 'ms')).toEqual(2592000000);
    expect(convertDate(1, 'y', 'ms')).toEqual(31536000000);
  });

  it('converts from small units to big units', () => {
    expect(convertDate(1000, 'ms', 's')).toEqual(1);
    expect(convertDate(60000, 'ms', 'm')).toEqual(1);
    expect(convertDate(3600000, 'ms', 'h')).toEqual(1);
    expect(convertDate(86400000, 'ms', 'd')).toEqual(1);
    expect(convertDate(2592000000, 'ms', 'M')).toEqual(1);
    expect(convertDate(31536000000, 'ms', 'y')).toEqual(1);
  });

  it('Handles days to years', () => {
    expect(convertDate(1, 'y', 'd')).toEqual(365);
    expect(convertDate(365, 'd', 'y')).toEqual(1);
  });

  it('Handles years to months', () => {
    expect(convertDate(1, 'y', 'M')).toEqual(12);
    expect(convertDate(12, 'M', 'y')).toEqual(1);
  });

  it('Handles days to months', () => {
    expect(convertDate(1, 'M', 'd')).toEqual(30);
    expect(convertDate(30, 'd', 'M')).toEqual(1);
  });

  it('Handles days to weeks', () => {
    expect(convertDate(1, 'w', 'd')).toEqual(7);
    expect(convertDate(7, 'd', 'w')).toEqual(1);
  });

  it('Handles weeks to years', () => {
    expect(convertDate(1, 'y', 'w')).toEqual(52);
    expect(convertDate(52, 'w', 'y')).toEqual(1);
  });
});
