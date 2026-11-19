/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import { parseRruleString, transformRruleStringToRrule } from './v1';

describe('parseRruleString', () => {
  describe('valid strings', () => {
    it('parses a DTSTART with TZID and an RRULE', () => {
      expect(
        parseRruleString(
          'DTSTART;TZID=Europe/Rome:20261117T090000\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=0,30'
        )
      ).toEqual({
        rrule: {
          freq: Frequency.WEEKLY,
          interval: 2,
          tzid: 'Europe/Rome',
          dtstart: '2026-11-17T08:00:00.000Z',
          byweekday: ['MO', 'WE'],
          byhour: [9],
          byminute: [0, 30],
        },
      });
    });

    it('parses a UTC DTSTART', () => {
      expect(parseRruleString('DTSTART:20261117T090000Z\nRRULE:FREQ=DAILY')).toEqual({
        rrule: {
          freq: Frequency.DAILY,
          interval: 1,
          tzid: 'UTC',
          dtstart: '2026-11-17T09:00:00.000Z',
        },
      });
    });

    it('defaults to UTC and interval 1 with no DTSTART', () => {
      expect(parseRruleString('RRULE:FREQ=HOURLY;BYMINUTE=15')).toEqual({
        rrule: { freq: Frequency.HOURLY, interval: 1, tzid: 'UTC', byminute: [15] },
      });
    });

    it('accepts a single line without the RRULE: prefix', () => {
      expect(parseRruleString('FREQ=DAILY;BYHOUR=9')).toEqual({
        rrule: { freq: Frequency.DAILY, interval: 1, tzid: 'UTC', byhour: [9] },
      });
    });

    it('keeps a DTSTART that matches the internal placeholder', () => {
      expect(parseRruleString('DTSTART:19700101T000000Z\nRRULE:FREQ=DAILY').rrule?.dtstart).toBe(
        '1970-01-01T00:00:00.000Z'
      );
    });

    it('moves a DTSTART in a DST gap forward', () => {
      expect(
        parseRruleString('DTSTART;TZID=Europe/Rome:20260329T023000\nRRULE:FREQ=DAILY').rrule
          ?.dtstart
      ).toBe('2026-03-29T01:30:00.000Z');
    });

    it('parses monthly rules with BYMONTHDAY and ordinal weekdays', () => {
      expect(parseRruleString('RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15;BYDAY=1MO,-1FR,+2TU')).toEqual({
        rrule: {
          freq: Frequency.MONTHLY,
          interval: 1,
          tzid: 'UTC',
          bymonthday: [1, 15],
          byweekday: ['+1MO', '-1FR', '+2TU'],
        },
      });
    });

    it('is case insensitive and ignores blank lines, CRLF and trailing semicolons', () => {
      expect(
        parseRruleString('\r\ndtstart:20261117T090000Z\r\nrrule:freq=weekly;byday=mo;\r\n')
      ).toEqual({
        rrule: {
          freq: Frequency.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          dtstart: '2026-11-17T09:00:00.000Z',
          byweekday: ['MO'],
        },
      });
    });
  });

  describe('invalid strings', () => {
    it.each([
      ['a missing FREQ', 'RRULE:INTERVAL=1', 'RRULE must include FREQ'],
      ['an unsupported FREQ', 'RRULE:FREQ=YEARLY', 'Unsupported FREQ "YEARLY"'],
      ['a zero INTERVAL', 'RRULE:FREQ=DAILY;INTERVAL=0', 'interval must be greater than 0'],
      ['a decimal INTERVAL', 'RRULE:FREQ=DAILY;INTERVAL=1.5', 'Invalid INTERVAL value: 1.5'],
      ['a non numeric BYHOUR', 'RRULE:FREQ=DAILY;BYHOUR=9,abc', 'Invalid BYHOUR value: abc'],
      ['an invalid BYDAY', 'RRULE:FREQ=WEEKLY;BYDAY=XX', 'Invalid BYDAY value: XX'],
      ['a BYDAY sign without ordinal', 'RRULE:FREQ=MONTHLY;BYDAY=+MO', 'Invalid BYDAY value: +MO'],
      [
        'BYMONTHDAY with a weekly rule',
        'RRULE:FREQ=WEEKLY;BYMONTHDAY=1',
        'BYMONTHDAY MUST NOT be used when FREQ is WEEKLY',
      ],
      ['a malformed DTSTART', 'DTSTART:2026-11-17T09:00:00Z\nRRULE:FREQ=DAILY', 'Cannot parse'],
      [
        'an impossible DTSTART date',
        'DTSTART:20261317T090000Z\nRRULE:FREQ=DAILY',
        'Invalid month: 13',
      ],
      [
        'an invalid DTSTART timezone',
        'DTSTART;TZID=Mars/Olympus:20261117T090000\nRRULE:FREQ=DAILY',
        'Invalid time zone specified',
      ],
    ])('rejects %s', (_, value, expectedError) => {
      const { rrule, error } = parseRruleString(value);
      expect(rrule).toBeUndefined();
      expect(error).toContain(expectedError);
    });
  });

  // rrule-temporal accepts these without errors, the tests document what gets stored
  describe('values that are accepted but ignored', () => {
    it.each([
      ['drops out of range BYHOUR values', 'RRULE:FREQ=DAILY;BYHOUR=9,24', { byhour: [9] }],
      ['drops out of range BYMINUTE values', 'RRULE:FREQ=DAILY;BYMINUTE=60', {}],
      ['ignores unsupported parts', 'RRULE:FREQ=DAILY;COUNT=3;BYMONTH=2', {}],
      ['ignores a TZID part', 'RRULE:FREQ=DAILY;TZID=Europe/Rome', {}],
      ['keeps the last of duplicate parts', 'RRULE:FREQ=WEEKLY;FREQ=DAILY', {}],
      ['drops BYMONTHDAY with a daily rule', 'RRULE:FREQ=DAILY;BYMONTHDAY=1', {}],
      [
        'drops BYHOUR with an hourly rule',
        'RRULE:FREQ=HOURLY;BYHOUR=9',
        { freq: Frequency.HOURLY },
      ],
    ])('%s', (_, value, expected) => {
      expect(parseRruleString(value)).toEqual({
        rrule: { freq: Frequency.DAILY, interval: 1, tzid: 'UTC', ...expected },
      });
    });

    it('reads a floating DTSTART as UTC', () => {
      expect(parseRruleString('DTSTART:20261117T090000\nRRULE:FREQ=DAILY').rrule?.dtstart).toBe(
        '2026-11-17T09:00:00.000Z'
      );
    });

    it('keeps the first of two DTSTART lines', () => {
      expect(
        parseRruleString('DTSTART:20261117T090000Z\nDTSTART:20261118T100000Z\nRRULE:FREQ=DAILY')
          .rrule?.dtstart
      ).toBe('2026-11-17T09:00:00.000Z');
    });
  });
});

describe('transformRruleStringToRrule', () => {
  it('returns the parsed rrule', () => {
    expect(transformRruleStringToRrule('RRULE:FREQ=DAILY')).toEqual({
      freq: Frequency.DAILY,
      interval: 1,
      tzid: 'UTC',
    });
  });

  it('throws on invalid strings', () => {
    expect(() => transformRruleStringToRrule('RRULE:FREQ=YEARLY')).toThrow(
      'Invalid rrule schedule: Unsupported FREQ "YEARLY"'
    );
  });
});
