/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency, Weekday } from '@kbn/rrule';
import { serializeRRule } from './rrule_serializer';
import { parseRRule } from './rrule_parser';

describe('serializeRRule', () => {
  describe('frequency mapping (matches design D2)', () => {
    it('serializes minutely with INTERVAL', () => {
      expect(serializeRRule({ freq: Frequency.MINUTELY, interval: 5 })).toBe(
        'FREQ=MINUTELY;INTERVAL=5'
      );
    });

    it('serializes hourly with INTERVAL', () => {
      expect(serializeRRule({ freq: Frequency.HOURLY, interval: 2 })).toBe(
        'FREQ=HOURLY;INTERVAL=2'
      );
    });

    it('serializes daily without optional parts', () => {
      expect(serializeRRule({ freq: Frequency.DAILY })).toBe('FREQ=DAILY');
    });

    it('serializes weekly with BYDAY and INTERVAL', () => {
      expect(
        serializeRRule({
          freq: Frequency.WEEKLY,
          byweekday: [Weekday.MO, Weekday.WE, Weekday.FR],
          interval: 2,
        })
      ).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR');
    });

    it('serializes weekly without INTERVAL when interval is 1', () => {
      expect(
        serializeRRule({
          freq: Frequency.WEEKLY,
          byweekday: [Weekday.TU, Weekday.TH],
          interval: 1,
        })
      ).toBe('FREQ=WEEKLY;BYDAY=TU,TH');
    });

    it('serializes monthly with BYMONTHDAY', () => {
      expect(serializeRRule({ freq: Frequency.MONTHLY, bymonthday: [1] })).toBe(
        'FREQ=MONTHLY;BYMONTHDAY=1'
      );
    });

    it('serializes yearly with BYMONTH and BYMONTHDAY', () => {
      expect(
        serializeRRule({
          freq: Frequency.YEARLY,
          bymonth: [1],
          bymonthday: [1],
        })
      ).toBe('FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1');
    });
  });

  describe('output ordering and minimization', () => {
    it('omits INTERVAL when value is 1 (RFC default)', () => {
      expect(serializeRRule({ freq: Frequency.MINUTELY, interval: 1 })).toBe('FREQ=MINUTELY');
    });

    it('omits INTERVAL when undefined', () => {
      expect(serializeRRule({ freq: Frequency.HOURLY })).toBe('FREQ=HOURLY');
    });

    it('emits parts in stable order: FREQ, INTERVAL, BYMONTH, BYMONTHDAY, BYDAY', () => {
      expect(
        serializeRRule({
          freq: Frequency.WEEKLY,
          interval: 3,
          byweekday: [Weekday.SA, Weekday.SU],
          bymonth: [3, 6],
          bymonthday: [10, 20],
        })
      ).toBe('FREQ=WEEKLY;INTERVAL=3;BYMONTH=3,6;BYMONTHDAY=10,20;BYDAY=SA,SU');
    });

    it('preserves unknown parts after recognized ones in insertion order', () => {
      expect(
        serializeRRule({
          freq: Frequency.DAILY,
          _unknown: { BYHOUR: '9', WKST: 'MO' },
        })
      ).toBe('FREQ=DAILY;BYHOUR=9;WKST=MO');
    });

    it('skips empty optional arrays', () => {
      expect(
        serializeRRule({
          freq: Frequency.DAILY,
          byweekday: [],
          bymonthday: [],
          bymonth: [],
        })
      ).toBe('FREQ=DAILY');
    });
  });

  describe('validation', () => {
    it('throws on invalid frequency', () => {
      expect(() => serializeRRule({ freq: 999 as unknown as Frequency })).toThrowError(
        /Invalid RRULE frequency/
      );
    });

    it('throws on non-integer INTERVAL', () => {
      expect(() => serializeRRule({ freq: Frequency.HOURLY, interval: 1.5 })).toThrowError(
        /INTERVAL must be a positive integer/
      );
    });

    it('throws on zero INTERVAL', () => {
      expect(() => serializeRRule({ freq: Frequency.HOURLY, interval: 0 })).toThrowError(
        /INTERVAL must be a positive integer/
      );
    });

    it('throws on negative INTERVAL', () => {
      expect(() => serializeRRule({ freq: Frequency.DAILY, interval: -2 })).toThrowError(
        /INTERVAL must be a positive integer/
      );
    });

    it('throws on SECONDLY frequency (not in the supported subset)', () => {
      expect(() => serializeRRule({ freq: Frequency.SECONDLY })).toThrowError(
        /Invalid RRULE frequency/
      );
    });

    it('throws when _unknown value contains ";"', () => {
      expect(() =>
        serializeRRule({ freq: Frequency.DAILY, _unknown: { WKST: 'MO;FOO=BAR' } })
      ).toThrowError(/forbidden delimiter/);
    });

    it('throws when _unknown value contains "="', () => {
      expect(() =>
        serializeRRule({ freq: Frequency.DAILY, _unknown: { WKST: 'A=B' } })
      ).toThrowError(/forbidden delimiter/);
    });

    it('throws when _unknown value contains "\\n"', () => {
      expect(() =>
        serializeRRule({ freq: Frequency.DAILY, _unknown: { WKST: 'A\nB' } })
      ).toThrowError(/forbidden delimiter/);
    });

    it('throws when _unknown value contains "\\r"', () => {
      expect(() =>
        serializeRRule({ freq: Frequency.DAILY, _unknown: { WKST: 'A\rB' } })
      ).toThrowError(/forbidden delimiter/);
    });
  });

  describe('round-trip with parser', () => {
    const cases: Array<[string, Parameters<typeof serializeRRule>[0]]> = [
      ['minutely', { freq: Frequency.MINUTELY, interval: 5 }],
      ['hourly', { freq: Frequency.HOURLY, interval: 2 }],
      ['daily', { freq: Frequency.DAILY }],
      [
        'weekly with days',
        {
          freq: Frequency.WEEKLY,
          byweekday: [Weekday.MO, Weekday.WE, Weekday.FR],
        },
      ],
      [
        'weekly with days + interval',
        {
          freq: Frequency.WEEKLY,
          byweekday: [Weekday.TU, Weekday.TH],
          interval: 2,
        },
      ],
      ['monthly', { freq: Frequency.MONTHLY, bymonthday: [15] }],
      ['yearly', { freq: Frequency.YEARLY, bymonth: [12], bymonthday: [25] }],
    ];

    it.each(cases)('round-trips %s', (_label, fields) => {
      const serialized = serializeRRule(fields);
      const parsed = parseRRule(serialized);
      expect(serializeRRule(parsed)).toBe(serialized);
    });
  });

  // L4 (architect-review follow-up): JS object key iteration order is
  // specified for non-numeric string keys, but the assertion that "_unknown
  // parts come out in insertion order, after recognized parts" must be
  // robust to any RRULE part name a future spec might allow. These tests
  // pin the contract.
  describe('_unknown stable ordering on round-trip', () => {
    it('preserves _unknown insertion order through parse → serialize', () => {
      const original = 'FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=30;WKST=MO';
      const parsed = parseRRule(original);
      expect(parsed._unknown).toEqual({ BYHOUR: '9', BYMINUTE: '30', WKST: 'MO' });
      expect(serializeRRule(parsed)).toBe(original);
    });

    it('preserves a different _unknown insertion order through parse → serialize', () => {
      const original = 'FREQ=DAILY;WKST=SU;BYHOUR=12;BYSETPOS=1';
      const parsed = parseRRule(original);
      expect(serializeRRule(parsed)).toBe(original);
    });

    it('emits all recognized parts before any _unknown, regardless of source order', () => {
      const sourceWithUnknownInterleaved = 'FREQ=WEEKLY;BYHOUR=9;BYDAY=MO;WKST=MO';
      const parsed = parseRRule(sourceWithUnknownInterleaved);
      // Recognized parts (FREQ, INTERVAL, BYMONTH, BYMONTHDAY, BYDAY) come first;
      // unknown parts (BYHOUR, WKST) follow in insertion order.
      expect(serializeRRule(parsed)).toBe('FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;WKST=MO');
    });

    it('preserves _unknown values whose names start with a digit-adjacent character', () => {
      // Guard rail: even if a future RRULE spec permits non-alphabetic part
      // names, insertion order must hold. We construct the _unknown record
      // explicitly so the test does not depend on parser tolerance.
      expect(
        serializeRRule({
          freq: Frequency.DAILY,
          _unknown: { Z_PART: '1', A_PART: '2' },
        })
      ).toBe('FREQ=DAILY;Z_PART=1;A_PART=2');
    });
  });
});
