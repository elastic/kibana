/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { uiSettingsServiceMock } from '../../../../../../src/core/public/mocks';
import {
  getTimeRangeSettings,
  getIntervalSettings,
  parseDateWithDefault,
} from './default_date_settings';
import {
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_INTERVAL_TYPE,
} from '../../common/constants';
import { Policy } from '../store/inputs/model';

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

describe('getTimeRangeSettings', () => {
  let uiSettingsMock = uiSettingsServiceMock.createStartContract();

  beforeEach(() => {
    uiSettingsMock = uiSettingsServiceMock.createStartContract();
    uiSettingsMock.get.mockReturnValue({ from: DEFAULT_FROM, to: DEFAULT_TO });
  });

  describe('fromStr', () => {
    test('should return the DEFAULT_FROM constant by default', () => {
      const { fromStr } = getTimeRangeSettings(uiSettingsMock);
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return a custom from range', () => {
      uiSettingsMock.get.mockReturnValue({ from: 'now-15m' });
      const { fromStr } = getTimeRangeSettings(uiSettingsMock);
      expect(fromStr).toBe('now-15m');
    });

    test('should return the DEFAULT_FROM when the whole object is null', () => {
      uiSettingsMock.get.mockReturnValue(null);
      const { fromStr } = getTimeRangeSettings(uiSettingsMock);
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the whole object is undefined', () => {
      uiSettingsMock.get.mockReturnValue(undefined);
      const { fromStr } = getTimeRangeSettings(uiSettingsMock);
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is null', () => {
      uiSettingsMock.get.mockReturnValue({ from: null });
      const { fromStr } = getTimeRangeSettings();
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is undefined', () => {
      uiSettingsMock.get.mockReturnValue({ from: undefined });
      const { fromStr } = getTimeRangeSettings();
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is malformed', () => {
      uiSettingsMock.get.mockReturnValue({ from: true });

      const { fromStr } = getTimeRangeSettings(uiSettingsMock);
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    describe('without UISettings', () => {
      it('is DEFAULT_FROM without UI Settings', () => {
        const { fromStr } = getTimeRangeSettings();
        expect(fromStr).toBe(DEFAULT_FROM);
      });
    });
  });

  describe('toStr', () => {
    test('should return the DEFAULT_TO constant by default', () => {
      const { toStr } = getTimeRangeSettings(uiSettingsMock);
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return a custom from range', () => {
      uiSettingsMock.get.mockReturnValue({ to: 'now-15m' });
      const { toStr } = getTimeRangeSettings(uiSettingsMock);
      expect(toStr).toBe('now-15m');
    });

    test('should return the DEFAULT_TO when the whole object is null', () => {
      uiSettingsMock.get.mockReturnValue(null);
      const { toStr } = getTimeRangeSettings(uiSettingsMock);
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the whole object is undefined', () => {
      uiSettingsMock.get.mockReturnValue(undefined);
      const { toStr } = getTimeRangeSettings(uiSettingsMock);
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the to value is null', () => {
      uiSettingsMock.get.mockReturnValue({ from: null });
      const { toStr } = getTimeRangeSettings(uiSettingsMock);
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the from value is undefined', () => {
      uiSettingsMock.get.mockReturnValue({ to: undefined });
      const { toStr } = getTimeRangeSettings(uiSettingsMock);
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the to value is malformed', () => {
      uiSettingsMock.get.mockReturnValue({ to: true });
      const { toStr } = getTimeRangeSettings(uiSettingsMock);
      expect(toStr).toBe(DEFAULT_TO);
    });

    describe('without UISettings', () => {
      it('is DEFAULT_TO', () => {
        const { toStr } = getTimeRangeSettings();
        expect(toStr).toBe(DEFAULT_TO);
      });
    });
  });

  describe('from', () => {
    test('should return DEFAULT_FROM', () => {
      const { from } = getTimeRangeSettings(uiSettingsMock);
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return a custom from range', () => {
      const mockFrom = '2019-08-30T17:49:18.396Z';
      uiSettingsMock.get.mockReturnValue({ from: mockFrom });
      const { from } = getTimeRangeSettings(uiSettingsMock);
      expect(from).toBe(new Date(mockFrom).valueOf());
    });

    test('should return the DEFAULT_FROM when the whole object is null', () => {
      uiSettingsMock.get.mockReturnValue(null);
      const { from } = getTimeRangeSettings(uiSettingsMock);
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the whole object is undefined', () => {
      uiSettingsMock.get.mockReturnValue(undefined);
      const { from } = getTimeRangeSettings(uiSettingsMock);
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is null', () => {
      uiSettingsMock.get.mockReturnValue({ from: null });
      const { from } = getTimeRangeSettings(uiSettingsMock);
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is undefined', () => {
      uiSettingsMock.get.mockReturnValue({ from: undefined });
      const { from } = getTimeRangeSettings(uiSettingsMock);
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is malformed', () => {
      uiSettingsMock.get.mockReturnValue({ from: true });
      const { from } = getTimeRangeSettings(uiSettingsMock);
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    describe('without UISettings', () => {
      it('is DEFAULT_FROM in epoch', () => {
        const { from } = getTimeRangeSettings();
        expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
      });
    });
  });

  describe('to', () => {
    test('should return DEFAULT_TO', () => {
      const { to } = getTimeRangeSettings(uiSettingsMock);
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return a custom from range', () => {
      const mockTo = '2000-08-30T17:49:18.396Z';
      uiSettingsMock.get.mockReturnValue({ to: mockTo });
      const { to } = getTimeRangeSettings(uiSettingsMock);
      expect(to).toBe(new Date(mockTo).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the whole object is null', () => {
      uiSettingsMock.get.mockReturnValue(null);
      const { to } = getTimeRangeSettings(uiSettingsMock);
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the whole object is undefined', () => {
      uiSettingsMock.get.mockReturnValue(undefined);
      const { to } = getTimeRangeSettings(uiSettingsMock);
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is null', () => {
      uiSettingsMock.get.mockReturnValue({ from: null });
      const { to } = getTimeRangeSettings(uiSettingsMock);
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is undefined', () => {
      uiSettingsMock.get.mockReturnValue({ from: undefined });
      const { to } = getTimeRangeSettings(uiSettingsMock);
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is malformed', () => {
      uiSettingsMock.get.mockReturnValue({ from: true });
      const { to } = getTimeRangeSettings(uiSettingsMock);
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    describe('without UISettings', () => {
      it('is DEFAULT_TO in epoch', () => {
        const { to } = getTimeRangeSettings();
        expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
      });
    });
  });
});

describe('getIntervalSettings', () => {
  let uiSettingsMock = uiSettingsServiceMock.createStartContract();

  beforeEach(() => {
    uiSettingsMock = uiSettingsServiceMock.createStartContract();
    uiSettingsMock.get.mockReturnValue({
      pause: DEFAULT_INTERVAL_PAUSE,
      value: DEFAULT_INTERVAL_VALUE,
    });
  });

  describe('kind', () => {
    test('should return default', () => {
      const { kind } = getIntervalSettings(uiSettingsMock);
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return an interval when given non paused value', () => {
      uiSettingsMock.get.mockReturnValue({ pause: false });
      const { kind } = getIntervalSettings(uiSettingsMock);
      const expected: Policy['kind'] = 'interval';
      expect(kind).toBe(expected);
    });

    test('should return a manual when given a paused value', () => {
      uiSettingsMock.get.mockReturnValue({ pause: true });
      const { kind } = getIntervalSettings(uiSettingsMock);
      const expected: Policy['kind'] = 'manual';
      expect(kind).toBe(expected);
    });

    test('should return the default when the whole object is null', () => {
      uiSettingsMock.get.mockReturnValue(null);
      const { kind } = getIntervalSettings(uiSettingsMock);
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the whole object is undefined', () => {
      uiSettingsMock.get.mockReturnValue(undefined);
      const { kind } = getIntervalSettings(uiSettingsMock);
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the value is null', () => {
      uiSettingsMock.get.mockReturnValue({ pause: null });
      const { kind } = getIntervalSettings(uiSettingsMock);
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the value is undefined', () => {
      uiSettingsMock.get.mockReturnValue({ pause: undefined });
      const { kind } = getIntervalSettings(uiSettingsMock);
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the from value is malformed', () => {
      uiSettingsMock.get.mockReturnValue({ pause: 'whoops a string' });
      const { kind } = getIntervalSettings(uiSettingsMock);
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    describe('without UISettings', () => {
      it('is DEFAULT_INTERVAL_TYPE', () => {
        const { kind } = getIntervalSettings();
        expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
      });
    });
  });

  describe('duration', () => {
    test('should return default', () => {
      const { duration } = getIntervalSettings(uiSettingsMock);
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return a value when given a paused value', () => {
      uiSettingsMock.get.mockReturnValue({ value: 5 });
      const { duration } = getIntervalSettings(uiSettingsMock);
      const expected: Policy['duration'] = 5;
      expect(duration).toBe(expected);
    });

    test('should return the default when the whole object is null', () => {
      uiSettingsMock.get.mockReturnValue(null);
      const { duration } = getIntervalSettings(uiSettingsMock);
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the whole object is undefined', () => {
      uiSettingsMock.get.mockReturnValue(undefined);
      const { duration } = getIntervalSettings(uiSettingsMock);
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is null', () => {
      uiSettingsMock.get.mockReturnValue({ value: null });
      const { duration } = getIntervalSettings(uiSettingsMock);
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is undefined', () => {
      uiSettingsMock.get.mockReturnValue({ value: undefined });
      const { duration } = getIntervalSettings(uiSettingsMock);
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is malformed', () => {
      uiSettingsMock.get.mockReturnValue({ value: 'whoops a string' });
      const { duration } = getIntervalSettings(uiSettingsMock);
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    describe('without UISettings', () => {
      it('is DEFAULT_INTERVAL_VALUE', () => {
        const { duration } = getIntervalSettings();
        expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
      });
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
