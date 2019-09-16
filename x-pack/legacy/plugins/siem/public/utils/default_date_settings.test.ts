/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  getDefaultFromString,
  DefaultTimeRangeSetting,
  getDefaultToString,
  getDefaultFromValue,
  getDefaultToValue,
  getDefaultFromMoment,
  getDefaultToMoment,
  DefaultIntervalSetting,
  getDefaultIntervalKind,
  getDefaultIntervalDuration,
  parseDateString,
  parseDateWithDefault,
} from './default_date_settings';
import {
  DEFAULT_FROM,
  DEFAULT_SIEM_TIME_RANGE,
  DEFAULT_TO,
  DEFAULT_SIEM_REFRESH_INTERVAL,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_INTERVAL_TYPE,
} from '../../common/constants';
import { Policy } from '../store/inputs/model';
import moment from 'moment';

// Change the constants to be static values so we can test against those instead of
// relative sliding date times. Jest cannot access these outer scoped variables so
// we have to repeat ourselves once
const DEFAULT_FROM_DATE = '1983-05-31T13:03:54.234Z';
const DEFAULT_TO_DATE = '1990-05-31T13:03:54.234Z';
jest.mock('../../common/constants', () => ({
  DEFAULT_FROM: '1983-05-31T13:03:54.234Z',
  DEFAULT_TO: '1990-05-31T13:03:54.234Z',
  DEFAULT_INTERVAL_PAUSE: true,
  DEFAULT_INTERVAL_TYPE: 'manual',
  DEFAULT_INTERVAL_VALUE: 300000,
  DEFAULT_SIEM_REFRESH_INTERVAL: 'siem:refreshIntervalDefaults',
  DEFAULT_SIEM_TIME_RANGE: 'siem:timeDefaults',
}));

/**
 * We utilize the internal chrome mocking that is built in to be able to mock different time range
 * scenarios here or the absence of a time range setting.
 * @param timeRange timeRange to use as a mock, including malformed data
 * @param interval interval to use as a mock, including malformed data
 */
const mockTimeRange = (
  timeRange: DefaultTimeRangeSetting = { from: DEFAULT_FROM, to: DEFAULT_TO },
  interval: DefaultIntervalSetting = {
    pause: DEFAULT_INTERVAL_PAUSE,
    value: DEFAULT_INTERVAL_VALUE,
  }
) => {
  chrome.getUiSettingsClient().get.mockImplementation((key: string) => {
    switch (key) {
      case DEFAULT_SIEM_TIME_RANGE:
        return timeRange;
      case DEFAULT_SIEM_REFRESH_INTERVAL:
        return interval;
      default:
        throw new Error(`Unexpected config key: ${key}`);
    }
  });
};

/**
 * Return that this unknown is only an object but we recognize in Typescript that we are ok
 * with the object being malformed.
 * @param timeRange Malformed object
 */
const isMalformedTimeRange = (timeRange: unknown): timeRange is DefaultTimeRangeSetting =>
  typeof timeRange === 'object';

/**
 * Return that this unknown is only an object but we recognize in Typescript that we are ok
 * with the object being malformed.
 * @param interval Malformed object
 */
const isMalformedInterval = (interval: unknown): interval is DefaultIntervalSetting =>
  typeof interval === 'object';

describe('default_date_settings', () => {
  beforeEach(() => {
    chrome.getUiSettingsClient().get.mockClear();
  });

  describe('#getDefaultFromString', () => {
    test('should return the DEFAULT_FROM constant by default', () => {
      mockTimeRange();
      const stringDefault = getDefaultFromString();
      expect(stringDefault).toBe(DEFAULT_FROM);
    });

    test('should return a custom from range', () => {
      mockTimeRange({ from: 'now-15m' });
      const stringDefault = getDefaultFromString();
      expect(stringDefault).toBe('now-15m');
    });

    test('should return the DEFAULT_FROM when the whole object is null', () => {
      mockTimeRange(null);
      const stringDefault = getDefaultFromString();
      expect(stringDefault).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the whole object is undefined', () => {
      mockTimeRange(null);
      const stringDefault = getDefaultFromString();
      expect(stringDefault).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is null', () => {
      mockTimeRange({ from: null });
      const stringDefault = getDefaultFromString();
      expect(stringDefault).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is undefined', () => {
      mockTimeRange({ from: undefined });
      const stringDefault = getDefaultFromString();
      expect(stringDefault).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is malformed', () => {
      const malformedTimeRange = { from: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const stringDefault = getDefaultFromString();
        expect(stringDefault).toBe(DEFAULT_FROM);
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });
  });

  describe('#getDefaultToString', () => {
    test('should return the DEFAULT_TO constant by default', () => {
      mockTimeRange();
      const stringDefault = getDefaultToString();
      expect(stringDefault).toBe(DEFAULT_TO);
    });

    test('should return a custom from range', () => {
      mockTimeRange({ to: 'now-15m' });
      const stringDefault = getDefaultToString();
      expect(stringDefault).toBe('now-15m');
    });

    test('should return the DEFAULT_TO when the whole object is null', () => {
      mockTimeRange(null);
      const stringDefault = getDefaultToString();
      expect(stringDefault).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the whole object is undefined', () => {
      mockTimeRange(null);
      const stringDefault = getDefaultToString();
      expect(stringDefault).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the to value is null', () => {
      mockTimeRange({ from: null });
      const stringDefault = getDefaultToString();
      expect(stringDefault).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the from value is undefined', () => {
      mockTimeRange({ to: undefined });
      const stringDefault = getDefaultToString();
      expect(stringDefault).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the to value is malformed', () => {
      const malformedTimeRange = { to: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const stringDefault = getDefaultToString();
        expect(stringDefault).toBe(DEFAULT_TO);
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });
  });

  describe('#getDefaultFromValue', () => {
    test('should return DEFAULT_FROM', () => {
      mockTimeRange();
      const value = getDefaultFromValue();
      expect(value).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return a custom from range', () => {
      const from = '2019-08-30T17:49:18.396Z';
      mockTimeRange({ from });
      const value = getDefaultFromValue();
      expect(value).toBe(new Date(from).valueOf());
    });

    test('should return the DEFAULT_FROM when the whole object is null', () => {
      mockTimeRange(null);
      const stringDefault = getDefaultFromValue();
      expect(stringDefault).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the whole object is undefined', () => {
      mockTimeRange(null);
      const stringDefault = getDefaultFromValue();
      expect(stringDefault).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is null', () => {
      mockTimeRange({ from: null });
      const stringDefault = getDefaultFromValue();
      expect(stringDefault).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is undefined', () => {
      mockTimeRange({ from: undefined });
      const stringDefault = getDefaultFromValue();
      expect(stringDefault).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is malformed', () => {
      const malformedTimeRange = { from: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const stringDefault = getDefaultFromValue();
        expect(stringDefault).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });
  });

  describe('#getDefaultToValue', () => {
    test('should return DEFAULT_TO', () => {
      mockTimeRange();
      const value = getDefaultToValue();
      expect(value).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return a custom from range', () => {
      const to = '2000-08-30T17:49:18.396Z';
      mockTimeRange({ to });
      const value = getDefaultToValue();
      expect(value).toBe(new Date(to).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the whole object is null', () => {
      mockTimeRange(null);
      const stringDefault = getDefaultToValue();
      expect(stringDefault).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the whole object is undefined', () => {
      mockTimeRange(null);
      const stringDefault = getDefaultToValue();
      expect(stringDefault).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is null', () => {
      mockTimeRange({ from: null });
      const stringDefault = getDefaultToValue();
      expect(stringDefault).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is undefined', () => {
      mockTimeRange({ from: undefined });
      const stringDefault = getDefaultToValue();
      expect(stringDefault).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is malformed', () => {
      const malformedTimeRange = { from: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const stringDefault = getDefaultToValue();
        expect(stringDefault).toBe(new Date(DEFAULT_TO_DATE).valueOf());
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });
  });

  describe('#getDefaultFromMoment', () => {
    test('should return DEFAULT_FROM', () => {
      mockTimeRange();
      const value = getDefaultFromMoment();
      expect(value.valueOf()).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return a custom from range', () => {
      const from = '2019-08-30T17:49:18.396Z';
      mockTimeRange({ from });
      const value = getDefaultFromMoment();
      expect(value.valueOf()).toBe(new Date(from).valueOf());
    });

    test('should return the DEFAULT_FROM when the whole object is null', () => {
      mockTimeRange(null);
      const defaultMoment = getDefaultFromMoment();
      expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the whole object is undefined', () => {
      mockTimeRange(null);
      const defaultMoment = getDefaultFromMoment();
      expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is null', () => {
      mockTimeRange({ from: null });
      const defaultMoment = getDefaultFromMoment();
      expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is undefined', () => {
      mockTimeRange({ from: undefined });
      const defaultMoment = getDefaultFromMoment();
      expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is malformed', () => {
      const malformedTimeRange = { from: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const defaultMoment = getDefaultFromMoment();
        expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });
  });

  describe('#getDefaultToMoment', () => {
    test('should return DEFAULT_TO', () => {
      mockTimeRange();
      const value = getDefaultToMoment();
      expect(value.valueOf()).toBe(new Date(DEFAULT_TO).valueOf());
    });

    test('should return a custom range', () => {
      const to = '2019-08-30T17:49:18.396Z';
      mockTimeRange({ to });
      const value = getDefaultToMoment();
      expect(value.valueOf()).toBe(new Date(to).valueOf());
    });

    test('should return the DEFAULT_TO when the whole object is null', () => {
      mockTimeRange(null);
      const defaultMoment = getDefaultToMoment();
      expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_TO).valueOf());
    });

    test('should return the DEFAULT_TO when the whole object is undefined', () => {
      mockTimeRange(null);
      const defaultMoment = getDefaultToMoment();
      expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_TO).valueOf());
    });

    test('should return the DEFAULT_TO when the from value is null', () => {
      mockTimeRange({ from: null });
      const defaultMoment = getDefaultToMoment();
      expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_TO).valueOf());
    });

    test('should return the DEFAULT_TO when the from value is undefined', () => {
      mockTimeRange({ from: undefined });
      const defaultMoment = getDefaultToMoment();
      expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_TO).valueOf());
    });

    test('should return the DEFAULT_TO when the from value is malformed', () => {
      const malformedTimeRange = { from: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const defaultMoment = getDefaultToMoment();
        expect(defaultMoment.valueOf()).toBe(new Date(DEFAULT_TO).valueOf());
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });
  });

  describe('#getDefaultIntervalKind', () => {
    test('should return default', () => {
      mockTimeRange();
      const value = getDefaultIntervalKind();
      expect(value).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return an interval when given non paused value', () => {
      const interval: DefaultIntervalSetting = { pause: false };
      mockTimeRange(undefined, interval);
      const value = getDefaultIntervalKind();
      const expected: Policy['kind'] = 'interval';
      expect(value).toBe(expected);
    });

    test('should return a manual when given a paused value', () => {
      const interval: DefaultIntervalSetting = { pause: true };
      mockTimeRange(undefined, interval);
      const value = getDefaultIntervalKind();
      const expected: Policy['kind'] = 'manual';
      expect(value).toBe(expected);
    });

    test('should return the default when the whole object is null', () => {
      mockTimeRange(undefined, null);
      const value = getDefaultIntervalKind();
      expect(value).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the whole object is undefined', () => {
      mockTimeRange(undefined, undefined);
      const value = getDefaultIntervalKind();
      expect(value).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the value is null', () => {
      mockTimeRange(undefined, { pause: null });
      const value = getDefaultIntervalKind();
      expect(value).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the value is undefined', () => {
      mockTimeRange(undefined, { pause: undefined });
      const value = getDefaultIntervalKind();
      expect(value).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the from value is malformed', () => {
      const malformedInterval = { pause: 'whoops a string' };
      if (isMalformedInterval(malformedInterval)) {
        mockTimeRange(undefined, malformedInterval);
        const value = getDefaultIntervalKind();
        expect(value).toBe(DEFAULT_INTERVAL_TYPE);
      } else {
        throw Error('Was expecting an object to be used for the malformed interval');
      }
    });
  });

  describe('#getDefaultIntervalDuration', () => {
    test('should return default', () => {
      mockTimeRange();
      const value = getDefaultIntervalDuration();
      expect(value).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return a value when given a paused value', () => {
      const interval: DefaultIntervalSetting = { value: 5 };
      mockTimeRange(undefined, interval);
      const value = getDefaultIntervalDuration();
      const expected: Policy['duration'] = 5;
      expect(value).toBe(expected);
    });

    test('should return the default when the whole object is null', () => {
      mockTimeRange(undefined, null);
      const value = getDefaultIntervalDuration();
      expect(value).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the whole object is undefined', () => {
      mockTimeRange(undefined, undefined);
      const value = getDefaultIntervalDuration();
      expect(value).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is null', () => {
      mockTimeRange(undefined, { value: null });
      const value = getDefaultIntervalDuration();
      expect(value).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is undefined', () => {
      mockTimeRange(undefined, { value: undefined });
      const value = getDefaultIntervalDuration();
      expect(value).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is malformed', () => {
      const malformedInterval = { value: 'whoops a string' };
      if (isMalformedInterval(malformedInterval)) {
        mockTimeRange(undefined, malformedInterval);
        const value = getDefaultIntervalDuration();
        expect(value).toBe(DEFAULT_INTERVAL_VALUE);
      } else {
        throw Error('Was expecting an object to be used for the malformed interval');
      }
    });
  });

  describe('#parseDateString', () => {
    test('should return the first value as a moment if everything is ok', () => {
      const value = parseDateString(
        '1930-05-31T13:03:54.234Z',
        '1940-05-31T13:03:54.234Z',
        moment('1950-05-31T13:03:54.234Z')
      );
      expect(value.valueOf()).toBe(new Date('1930-05-31T13:03:54.234Z').valueOf());
    });

    test('should return the second value as a moment if the first is null', () => {
      const value = parseDateString(
        null,
        '1940-05-31T13:03:54.234Z',
        moment('1950-05-31T13:03:54.234Z')
      );
      expect(value.valueOf()).toBe(new Date('1940-05-31T13:03:54.234Z').valueOf());
    });

    test('should return the second value as a moment if the first is undefined', () => {
      const value = parseDateString(
        null,
        '1940-05-31T13:03:54.234Z',
        moment('1950-05-31T13:03:54.234Z')
      );
      expect(value.valueOf()).toBe(new Date('1940-05-31T13:03:54.234Z').valueOf());
    });
  });

  describe('#parseDateWithDefault', () => {
    beforeEach(() => {
      // Disable momentJS deprecation warning and it looks like it is not typed either so
      // we have to disable the type as well and cannot extend it easily.
      ((moment as unknown) as {
        suppressDeprecationWarnings: boolean;
      }).suppressDeprecationWarnings = true;
    });

    afterEach(() => {
      // Re-enable momentJS deprecation warning and it looks like it is not typed either so
      // we have to disable the type as well and cannot extend it easily.
      ((moment as unknown) as {
        suppressDeprecationWarnings: boolean;
      }).suppressDeprecationWarnings = false;
    });
    test('should return the first value if it is ok', () => {
      const value = parseDateWithDefault(
        '1930-05-31T13:03:54.234Z',
        moment('1950-05-31T13:03:54.234Z')
      );
      expect(value.valueOf()).toBe(new Date('1930-05-31T13:03:54.234Z').valueOf());
    });

    test('should return the second value if the first is a bad string', () => {
      const value = parseDateWithDefault('trashed string', moment('1950-05-31T13:03:54.234Z'));
      expect(value.valueOf()).toBe(new Date('1950-05-31T13:03:54.234Z').valueOf());
    });
  });
});
