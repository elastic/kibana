/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  asPercent,
  asTime,
  getFixedByteFormatter,
  asDynamicBytes,
  timeSerieTickFormatter
} from '../formatters';

describe('formatters', () => {
  describe('asTime', () => {
    it('formats correctly with defaults', () => {
      expect(asTime(null)).toEqual('N/A');
      expect(asTime(undefined)).toEqual('N/A');
      expect(asTime(0)).toEqual('0 μs');
      expect(asTime(1)).toEqual('1 μs');
      expect(asTime(1000)).toEqual('1,000 μs');
      expect(asTime(1000 * 1000)).toEqual('1,000 ms');
      expect(asTime(1000 * 1000 * 10)).toEqual('10,000 ms');
      expect(asTime(1000 * 1000 * 20)).toEqual('20.0 s');
      expect(asTime(60000000 * 10)).toEqual('10.0 min');
      expect(asTime(3600000000 * 1.5)).toEqual('1.5 h');
    });

    it('formats without unit', () => {
      expect(asTime(1000, { withUnit: false })).toEqual('1,000');
    });

    it('falls back to default value', () => {
      expect(asTime(undefined, { defaultValue: 'nope' })).toEqual('nope');
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
  describe('tick formatter for time series', () => {
    describe('normal time ranges', () => {
      it('millisecond', () => {
        const ticks = [
          new Date('2019-09-02T08:41:42.225'),
          new Date('2019-09-02T08:41:42.250'),
          new Date('2019-09-02T08:41:42.275'),
          new Date('2019-09-02T08:41:42.300'),
          new Date('2019-09-02T08:41:42.325')
        ];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual([
          '.225',
          '.250',
          '.275',
          '.300',
          '.325'
        ]);
      });
      it('seconds', () => {
        const ticks = [
          new Date('2019-09-02T08:41:42.225'),
          new Date('2019-09-02T08:41:43.250'),
          new Date('2019-09-02T08:41:44.275'),
          new Date('2019-09-02T08:41:45.300'),
          new Date('2019-09-02T08:41:46.325')
        ];
        const expected = ["42''", "43''", "44''", "45''", "46''"];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('minutes', () => {
        const ticks = [
          new Date('2019-09-02T08:41:42.225'),
          new Date('2019-09-02T08:42:43.250'),
          new Date('2019-09-02T08:43:44.275'),
          new Date('2019-09-02T08:44:45.300'),
          new Date('2019-09-02T08:45:46.325')
        ];
        const expected = ["41'", "42'", "43'", "44'", "45'"];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('hours', () => {
        const ticks = [
          new Date('2019-09-02T08:41:42.225'),
          new Date('2019-09-02T09:42:43.250'),
          new Date('2019-09-02T10:43:44.275'),
          new Date('2019-09-02T11:44:45.300'),
          new Date('2019-09-02T12:45:46.325')
        ];
        const expected = ['08', '09', '10', '11', '12'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('days', () => {
        const ticks = [
          new Date('2019-09-02T08:41:42.225'),
          new Date('2019-09-03T09:42:43.250'),
          new Date('2019-09-04T10:43:44.275'),
          new Date('2019-09-05T11:44:45.300'),
          new Date('2019-09-06T12:45:46.325')
        ];
        const expected = ['2nd', '3rd', '4th', '5th', '6th'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('months', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2019-08-03T09:42:43.250'),
          new Date('2019-09-04T10:43:44.275'),
          new Date('2019-10-05T11:44:45.300'),
          new Date('2019-11-06T12:45:46.325')
        ];
        const expected = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('years', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2020-08-03T09:42:43.250'),
          new Date('2021-09-04T10:43:44.275'),
          new Date('2022-10-05T11:44:45.300'),
          new Date('2023-11-06T12:45:46.325')
        ];
        const expected = ['2019', '2020', '2021', '2022', '2023'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
    });
    describe('only one change', () => {
      it('years', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2019-08-03T09:42:43.250'),
          new Date('2019-09-04T10:43:44.275'),
          new Date('2020-01-05T11:44:45.300'),
          new Date('2020-02-06T12:45:46.325')
        ];
        const expected = ['Jul', 'Aug', 'Sep', 'Jan', 'Feb'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('months', () => {
        const ticks = [
          new Date('2019-08-02T08:41:42.225'),
          new Date('2019-08-03T09:42:43.250'),
          new Date('2019-08-04T10:43:44.275'),
          new Date('2019-09-05T11:44:45.300'),
          new Date('2019-09-06T12:45:46.325')
        ];
        const expected = ['2nd', '3rd', '4th', '5th', '6th'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('days', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2019-07-02T09:42:43.250'),
          new Date('2019-07-02T10:43:44.275'),
          new Date('2019-07-03T11:44:45.300'),
          new Date('2019-07-03T12:45:46.325')
        ];
        const expected = ['08', '09', '10', '11', '12'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('hours', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2019-07-02T08:42:43.250'),
          new Date('2019-07-02T09:43:44.275'),
          new Date('2019-07-02T09:44:45.300'),
          new Date('2019-07-02T09:45:46.325')
        ];
        const expected = ["41'", "42'", "43'", "44'", "45'"];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('minutes', () => {
        const ticks = [
          new Date('2019-07-02T08:01:02.225'),
          new Date('2019-07-02T08:01:43.250'),
          new Date('2019-07-02T08:02:44.275'),
          new Date('2019-07-02T08:02:45.300'),
          new Date('2019-07-02T08:02:46.325')
        ];
        const expected = ["2''", "43''", "44''", "45''", "46''"];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('seconds', () => {
        const ticks = [
          new Date('2019-07-02T08:01:02.225'),
          new Date('2019-07-02T08:01:02.250'),
          new Date('2019-07-02T08:01:03.275'),
          new Date('2019-07-02T08:01:03.300'),
          new Date('2019-07-02T08:01:03.325')
        ];
        const expected = ['.225', '.250', '.275', '.300', '.325'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
    });
    describe('duplicate label', () => {
      it('years', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2019-08-03T09:42:43.250'),
          new Date('2021-09-04T10:43:44.275'),
          new Date('2022-10-05T11:44:45.300'),
          new Date('2023-11-06T12:45:46.325')
        ];
        const expected = [
          '2019 Jul',
          '2019 Aug',
          '2021 Sep',
          '2022 Oct',
          '2023 Nov'
        ];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('months', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2019-08-03T09:42:43.250'),
          new Date('2019-08-04T10:43:44.275'),
          new Date('2019-10-05T11:44:45.300'),
          new Date('2019-11-01T12:45:46.325')
        ];
        const expected = [
          'Jul 2nd',
          'Aug 3rd',
          'Aug 4th',
          'Oct 5th',
          'Nov 1st'
        ];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('days', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2019-07-02T09:42:43.250'),
          new Date('2019-07-04T10:43:44.275'),
          new Date('2019-07-05T11:44:45.300'),
          new Date('2019-07-06T12:45:46.325')
        ];
        const expected = ['2nd 08', '2nd 09', '4th 10', '5th 11', '6th 12'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('hours', () => {
        const ticks = [
          new Date('2019-07-02T08:41:42.225'),
          new Date('2019-07-02T08:42:43.250'),
          new Date('2019-07-02T10:43:44.275'),
          new Date('2019-07-02T11:44:45.300'),
          new Date('2019-07-02T12:05:46.325')
        ];
        const expected = ['08:41', '08:42', '10:43', '11:44', '12:05'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('minutes', () => {
        const ticks = [
          new Date('2019-07-02T08:01:02.225'),
          new Date('2019-07-02T08:01:43.250'),
          new Date('2019-07-02T08:43:44.275'),
          new Date('2019-07-02T08:44:45.300'),
          new Date('2019-07-02T08:45:46.325')
        ];
        const expected = [
          "1' 2''",
          "1' 43''",
          "43' 44''",
          "44' 45''",
          "45' 46''"
        ];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
      it('seconds', () => {
        const ticks = [
          new Date('2019-07-02T08:01:02.225'),
          new Date('2019-07-02T08:01:02.250'),
          new Date('2019-07-02T08:01:44.275'),
          new Date('2019-07-02T08:01:45.300'),
          new Date('2019-07-02T08:01:46.325')
        ];
        const expected = ['2.225', '2.250', '44.275', '45.300', '46.325'];

        const formatter = timeSerieTickFormatter(ticks);
        expect(ticks.map(formatter)).toEqual(expected);
      });
    });
  });
});
