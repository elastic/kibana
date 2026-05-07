/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency, Weekday } from '@kbn/rrule';
import { parseRRule } from './rrule_parser';
import { serializeRRule } from './rrule_serializer';

describe('parseRRule', () => {
  describe('recognized parts', () => {
    it('parses FREQ-only minutely/hourly/daily/weekly/monthly/yearly', () => {
      expect(parseRRule('FREQ=MINUTELY')).toEqual({ freq: Frequency.MINUTELY });
      expect(parseRRule('FREQ=HOURLY')).toEqual({ freq: Frequency.HOURLY });
      expect(parseRRule('FREQ=DAILY')).toEqual({ freq: Frequency.DAILY });
      expect(parseRRule('FREQ=WEEKLY')).toEqual({ freq: Frequency.WEEKLY });
      expect(parseRRule('FREQ=MONTHLY')).toEqual({ freq: Frequency.MONTHLY });
      expect(parseRRule('FREQ=YEARLY')).toEqual({ freq: Frequency.YEARLY });
    });

    it('parses INTERVAL', () => {
      expect(parseRRule('FREQ=HOURLY;INTERVAL=4')).toEqual({
        freq: Frequency.HOURLY,
        interval: 4,
      });
    });

    it('parses BYDAY into Weekday enum values', () => {
      expect(parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toEqual({
        freq: Frequency.WEEKLY,
        byweekday: [Weekday.MO, Weekday.WE, Weekday.FR],
      });
    });

    it('parses BYMONTHDAY as integer list', () => {
      expect(parseRRule('FREQ=MONTHLY;BYMONTHDAY=1,15')).toEqual({
        freq: Frequency.MONTHLY,
        bymonthday: [1, 15],
      });
    });

    it('parses BYMONTH alongside BYMONTHDAY', () => {
      expect(parseRRule('FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1')).toEqual({
        freq: Frequency.YEARLY,
        bymonth: [1],
        bymonthday: [1],
      });
    });
  });

  describe('input tolerance', () => {
    it('strips a leading RRULE: prefix', () => {
      expect(parseRRule('RRULE:FREQ=DAILY')).toEqual({ freq: Frequency.DAILY });
    });

    it('lowercases keys are accepted', () => {
      expect(parseRRule('freq=daily;interval=3')).toEqual({
        freq: Frequency.DAILY,
        interval: 3,
      });
    });

    it('ignores empty segments produced by leading/trailing/duplicate semicolons', () => {
      expect(parseRRule(';;FREQ=DAILY;;INTERVAL=2;;')).toEqual({
        freq: Frequency.DAILY,
        interval: 2,
      });
    });

    it('trims whitespace inside segments', () => {
      expect(parseRRule(' FREQ = DAILY ; INTERVAL = 2 ')).toEqual({
        freq: Frequency.DAILY,
        interval: 2,
      });
    });
  });

  describe('unknown parts passthrough (round-trip fidelity)', () => {
    it('captures unrecognized parts in _unknown preserving order', () => {
      const parsed = parseRRule('FREQ=DAILY;BYHOUR=9;WKST=MO;COUNT=10');
      expect(parsed).toEqual({
        freq: Frequency.DAILY,
        _unknown: { BYHOUR: '9', WKST: 'MO', COUNT: '10' },
      });
      // Insertion order is preserved by Object.entries.
      expect(Object.keys(parsed._unknown ?? {})).toEqual(['BYHOUR', 'WKST', 'COUNT']);
    });

    it('round-trips an RRULE containing unknown parts losslessly', () => {
      const input = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;BYHOUR=9;WKST=MO';
      const parsed = parseRRule(input);
      expect(serializeRRule(parsed)).toBe(input);
    });

    it('does not include _unknown when no unknown parts are present', () => {
      const parsed = parseRRule('FREQ=DAILY');
      expect(parsed).not.toHaveProperty('_unknown');
    });
  });

  describe('error handling', () => {
    it('throws when the string is empty', () => {
      expect(() => parseRRule('')).toThrowError(/empty/);
      expect(() => parseRRule('   ')).toThrowError(/empty/);
    });

    it('throws when FREQ is missing', () => {
      expect(() => parseRRule('INTERVAL=2')).toThrowError(/missing required FREQ/);
    });

    it('throws when FREQ value is unknown', () => {
      expect(() => parseRRule('FREQ=BOGUS')).toThrowError(/Invalid RRULE FREQ/);
    });

    it('throws when a part is missing the "=" separator', () => {
      expect(() => parseRRule('FREQ=DAILY;BYDAY')).toThrowError(/missing "="/);
    });

    it('throws when INTERVAL is not a positive integer', () => {
      expect(() => parseRRule('FREQ=DAILY;INTERVAL=0')).toThrowError(/positive integer/);
      expect(() => parseRRule('FREQ=DAILY;INTERVAL=-1')).toThrowError(/positive integer/);
      expect(() => parseRRule('FREQ=DAILY;INTERVAL=1.5')).toThrowError(/positive integer/);
      expect(() => parseRRule('FREQ=DAILY;INTERVAL=abc')).toThrowError(/positive integer/);
    });

    it('throws when BYDAY contains an invalid weekday', () => {
      expect(() => parseRRule('FREQ=WEEKLY;BYDAY=MO,XX')).toThrowError(/Invalid RRULE BYDAY/);
    });

    it('throws when BYMONTHDAY contains a non-integer', () => {
      expect(() => parseRRule('FREQ=MONTHLY;BYMONTHDAY=1,abc')).toThrowError(/Invalid integer/);
    });

    it('throws when input is not a string', () => {
      // @ts-expect-error -- exercising runtime guard
      expect(() => parseRRule(undefined)).toThrowError(/must be a string/);
    });
  });
});
