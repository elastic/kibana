/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment-timezone';
import {
  asPercent,
  asDuration,
  getFixedByteFormatter,
  asDynamicBytes,
  asRelativeDateRange,
  asAbsoluteTime
} from '../formatters';

describe('formatters', () => {
  describe('asDuration', () => {
    it('formats correctly with defaults', () => {
      expect(asDuration(null)).toEqual('N/A');
      expect(asDuration(undefined)).toEqual('N/A');
      expect(asDuration(0)).toEqual('0 μs');
      expect(asDuration(1)).toEqual('1 μs');
      expect(asDuration(1000)).toEqual('1,000 μs');
      expect(asDuration(1000 * 1000)).toEqual('1,000 ms');
      expect(asDuration(1000 * 1000 * 10)).toEqual('10,000 ms');
      expect(asDuration(1000 * 1000 * 20)).toEqual('20.0 s');
      expect(asDuration(60000000 * 10)).toEqual('10.0 min');
      expect(asDuration(3600000000 * 1.5)).toEqual('1.5 h');
    });

    it('formats without unit', () => {
      expect(asDuration(1000, { withUnit: false })).toEqual('1,000');
    });

    it('falls back to default value', () => {
      expect(asDuration(undefined, { defaultValue: 'nope' })).toEqual('nope');
    });
  });

  describe('asPercent', () => {
    it('should divide and format item as percent', () => {
      expect(asPercent(3725, 10000, 'n/a')).toEqual('37.3%');
    });

    it('should format when numerator is 0', () => {
      expect(asPercent(0, 1, 'n/a')).toEqual('0.0%');
    });

    it('should return fallback when denominator is undefined', () => {
      expect(asPercent(3725, undefined, 'n/a')).toEqual('n/a');
    });

    it('should return fallback when denominator is 0 ', () => {
      expect(asPercent(3725, 0, 'n/a')).toEqual('n/a');
    });

    it('should return fallback when numerator or denominator is NaN', () => {
      expect(asPercent(3725, NaN, 'n/a')).toEqual('n/a');
      expect(asPercent(NaN, 10000, 'n/a')).toEqual('n/a');
    });
  });

  describe('byte formatting', () => {
    const bytes = 10;
    const kb = 1000 + 1;
    const mb = 1e6 + 1;
    const gb = 1e9 + 1;
    const tb = 1e12 + 1;

    test('dynamic', () => {
      expect(asDynamicBytes(bytes)).toEqual('10.0 B');
      expect(asDynamicBytes(kb)).toEqual('1.0 KB');
      expect(asDynamicBytes(mb)).toEqual('1.0 MB');
      expect(asDynamicBytes(gb)).toEqual('1.0 GB');
      expect(asDynamicBytes(tb)).toEqual('1.0 TB');
      expect(asDynamicBytes(null)).toEqual('');
      expect(asDynamicBytes(NaN)).toEqual('');
    });

    describe('fixed', () => {
      test('in bytes', () => {
        const formatInBytes = getFixedByteFormatter(bytes);
        expect(formatInBytes(bytes)).toEqual('10.0 B');
        expect(formatInBytes(kb)).toEqual('1,001.0 B');
        expect(formatInBytes(mb)).toEqual('1,000,001.0 B');
        expect(formatInBytes(gb)).toEqual('1,000,000,001.0 B');
        expect(formatInBytes(tb)).toEqual('1,000,000,000,001.0 B');
        expect(formatInBytes(null)).toEqual('');
        expect(formatInBytes(NaN)).toEqual('');
      });

      test('in kb', () => {
        const formatInKB = getFixedByteFormatter(kb);
        expect(formatInKB(bytes)).toEqual('0.0 KB');
        expect(formatInKB(kb)).toEqual('1.0 KB');
        expect(formatInKB(mb)).toEqual('1,000.0 KB');
        expect(formatInKB(gb)).toEqual('1,000,000.0 KB');
        expect(formatInKB(tb)).toEqual('1,000,000,000.0 KB');
      });

      test('in mb', () => {
        const formatInMB = getFixedByteFormatter(mb);
        expect(formatInMB(bytes)).toEqual('0.0 MB');
        expect(formatInMB(kb)).toEqual('0.0 MB');
        expect(formatInMB(mb)).toEqual('1.0 MB');
        expect(formatInMB(gb)).toEqual('1,000.0 MB');
        expect(formatInMB(tb)).toEqual('1,000,000.0 MB');
        expect(formatInMB(null)).toEqual('');
        expect(formatInMB(NaN)).toEqual('');
      });

      test('in gb', () => {
        const formatInGB = getFixedByteFormatter(gb);
        expect(formatInGB(bytes)).toEqual('1e-8 GB');
        expect(formatInGB(kb)).toEqual('0.0 GB');
        expect(formatInGB(mb)).toEqual('0.0 GB');
        expect(formatInGB(gb)).toEqual('1.0 GB');
        expect(formatInGB(tb)).toEqual('1,000.0 GB');
        expect(formatInGB(null)).toEqual('');
        expect(formatInGB(NaN)).toEqual('');
      });

      test('in tb', () => {
        const formatInTB = getFixedByteFormatter(tb);
        expect(formatInTB(bytes)).toEqual('1e-11 TB');
        expect(formatInTB(kb)).toEqual('1.001e-9 TB');
        expect(formatInTB(mb)).toEqual('0.0 TB');
        expect(formatInTB(gb)).toEqual('0.0 TB');
        expect(formatInTB(tb)).toEqual('1.0 TB');
        expect(formatInTB(null)).toEqual('');
        expect(formatInTB(NaN)).toEqual('');
      });
    });
  });

  describe('asRelativeDateRange', () => {
    const formatDateToTimezone = (
      date: string,
      timezone: string = 'Europe/Amsterdam'
    ) =>
      moment(date)
        .tz(timezone)
        .valueOf();

    describe('years range', () => {
      it('returns years range when difference is greater than 5 years', () => {
        const start = formatDateToTimezone('2000-01-01 01:01:01');
        const end = formatDateToTimezone('2010-01-01 01:01:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('2000 - 2010');
      });
      it('returns years range when difference is equal to 5 years', () => {
        const start = formatDateToTimezone('2010-01-01 01:01:01');
        const end = formatDateToTimezone('2015-01-01 01:01:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('2010 - 2015');
      });
    });
    describe('months range', () => {
      it('when difference is equal to 4 years ', () => {
        const start = formatDateToTimezone('2010-01-01 01:01:01');
        const end = formatDateToTimezone('2014-04-01 01:01:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('Jan 2010 - Apr 2014');
      });
      it('when difference is equal to 6 months ', () => {
        const start = formatDateToTimezone('2019-01-01 01:01:01');
        const end = formatDateToTimezone('2019-07-01 01:01:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('Jan 2019 - Jul 2019');
      });
    });
    describe('days range', () => {
      it('when difference is greater than 1 days', () => {
        const start = formatDateToTimezone('2019-10-01 01:01:01');
        const end = formatDateToTimezone('2019-10-05 01:01:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('Oct 1, 2019 - Oct 5, 2019');
      });
      it('when difference is equal to 1 days', () => {
        const start = formatDateToTimezone('2019-10-01 01:01:01');
        const end = formatDateToTimezone('2019-10-03 01:01:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('Oct 1, 2019 - Oct 3, 2019');
      });
    });
    describe('hours range', () => {
      it('when difference is greater than 5 hours', () => {
        const start = formatDateToTimezone('2019-10-31 01:01:01');
        const end = formatDateToTimezone('2019-10-31 10:01:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('Oct 31, 2019, 01:01 - 10:01 (UTC+1)');
      });
      it('when difference is equal to 5 hours', () => {
        const start = formatDateToTimezone('2019-10-31 01:01:01');
        const end = formatDateToTimezone('2019-10-31 06:01:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('Oct 31, 2019, 01:01 - 06:01 (UTC+1)');
      });
    });
    describe('minutes range', () => {
      it('when difference is greater than 5 minutes', () => {
        const start = formatDateToTimezone('2019-10-31 01:01:01');
        const end = formatDateToTimezone('2019-10-31 01:15:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('Oct 31, 2019, 01:01:01 - 01:15:01 (UTC+1)');
      });
      it('when difference is equal to 5 minutes', () => {
        const start = formatDateToTimezone('2019-10-31 01:01:01');
        const end = formatDateToTimezone('2019-10-31 01:06:01');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual('Oct 31, 2019, 01:01:01 - 01:06:01 (UTC+1)');
      });
    });
    describe('milliseconds range', () => {
      it('when difference is greater than 5 seconds', () => {
        const start = formatDateToTimezone('2019-10-31 01:01:01.001');
        const end = formatDateToTimezone('2019-10-31 01:01:10.002');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual(
          'Oct 31, 2019, 01:01:01.001 - 01:01:10.002 (UTC+1)'
        );
      });
      it('when difference is equal to 1 second', () => {
        const start = formatDateToTimezone('2019-10-31 01:01:01.001');
        const end = formatDateToTimezone('2019-10-31 01:01:02.002');
        const dateRange = asRelativeDateRange(start, end);
        expect(dateRange).toEqual(
          'Oct 31, 2019, 01:01:01.001 - 01:01:02.002 (UTC+1)'
        );
      });
    });
  });

  describe('asAbsoluteTime', () => {
    afterAll(() => moment.tz.setDefault(''));

    it('should add a leading plus for timezones with positive UTC offset', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      expect(
        asAbsoluteTime({ time: 1559390400000, precision: 'minutes' })
      ).toBe('Jun 1, 2019, 14:00 (UTC+2)');
    });

    it('should add a leading minus for timezones with negative UTC offset', () => {
      moment.tz.setDefault('America/Los_Angeles');
      expect(
        asAbsoluteTime({ time: 1559390400000, precision: 'minutes' })
      ).toBe('Jun 1, 2019, 05:00 (UTC-7)');
    });

    it('should use default UTC offset formatting when offset contains minutes', () => {
      moment.tz.setDefault('Canada/Newfoundland');
      expect(
        asAbsoluteTime({ time: 1559390400000, precision: 'minutes' })
      ).toBe('Jun 1, 2019, 09:30 (UTC-02:30)');
    });

    it('should respect DST', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      const timeWithDST = 1559390400000; //  Jun 1, 2019
      const timeWithoutDST = 1575201600000; //  Dec 1, 2019

      expect(asAbsoluteTime({ time: timeWithDST })).toBe(
        'Jun 1, 2019, 14:00:00.000 (UTC+2)'
      );

      expect(asAbsoluteTime({ time: timeWithoutDST })).toBe(
        'Dec 1, 2019, 13:00:00.000 (UTC+1)'
      );
    });
  });
});
