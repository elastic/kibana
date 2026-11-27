/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_SCHEDULE_DRAFT,
  parseSchedule,
  type ScheduleDraft,
  scheduleToWith,
  validateSchedule,
} from './scheduled_trigger_model';

const calendar = (overrides: Partial<ScheduleDraft> = {}): ScheduleDraft => ({
  ...DEFAULT_SCHEDULE_DRAFT,
  mode: 'calendar',
  ...overrides,
});

describe('scheduled_trigger_model', () => {
  describe('parseSchedule', () => {
    it('opens a missing `with` on the default interval', () => {
      expect(parseSchedule(undefined)).toEqual(DEFAULT_SCHEDULE_DRAFT);
      expect(parseSchedule({})).toEqual(DEFAULT_SCHEDULE_DRAFT);
    });

    it('reads `every` as typed', () => {
      expect(parseSchedule({ every: '90s' })).toMatchObject({
        mode: 'interval',
        intervalText: '90s',
      });
    });

    it('reads a weekly rrule', () => {
      expect(
        parseSchedule({
          rrule: {
            freq: 'WEEKLY',
            interval: 1,
            tzid: 'UTC',
            byweekday: ['MO'],
            byhour: [7],
            byminute: [0],
          },
        })
      ).toMatchObject({
        mode: 'calendar',
        repeat: 'weekly',
        count: '1',
        weeklyDays: ['MO'],
        time: '07:00',
        tzid: 'UTC',
      });
    });

    it('reads a daily rrule with no days as every day, and with days as those days', () => {
      const every = parseSchedule({
        rrule: { freq: 'DAILY', interval: 2, tzid: 'UTC', byhour: [6], byminute: [30] },
      });
      expect(every).toMatchObject({ repeat: 'daily', count: '2', time: '06:30' });
      expect(every?.dailyDays).toEqual(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

      const weekdays = parseSchedule({
        rrule: {
          freq: 'DAILY',
          interval: 1,
          byweekday: ['FR', 'MO'],
          byhour: [6],
          byminute: [0],
        },
      });
      expect(weekdays?.dailyDays).toEqual(['MO', 'FR']);
      // No time zone is UTC, as the schema defaults it.
      expect(weekdays?.tzid).toBe('UTC');
    });

    it('reads a monthly rrule', () => {
      expect(
        parseSchedule({
          rrule: {
            freq: 'MONTHLY',
            interval: 1,
            tzid: 'Europe/Madrid',
            bymonthday: [15, 1],
            byhour: [9],
            byminute: [5],
          },
        })
      ).toMatchObject({
        repeat: 'monthly',
        monthDays: [1, 15],
        time: '09:05',
        tzid: 'Europe/Madrid',
      });
    });

    it.each([
      ['a dtstart', { freq: 'DAILY', interval: 1, tzid: 'UTC', dtstart: '2025-01-01T09:00:00Z' }],
      ['no hour', { freq: 'DAILY', interval: 1, tzid: 'UTC' }],
      ['several hours', { freq: 'DAILY', interval: 1, tzid: 'UTC', byhour: [1, 2], byminute: [0] }],
      [
        'an unknown time zone',
        { freq: 'DAILY', interval: 1, tzid: 'Mars/Base', byhour: [1], byminute: [0] },
      ],
      ['an unlisted frequency', { freq: 'HOURLY', interval: 1, byminute: [0] }],
      ['a weekly rule with no day', { freq: 'WEEKLY', interval: 1, byhour: [1], byminute: [0] }],
      [
        'a monthly rule with a weekday',
        {
          freq: 'MONTHLY',
          interval: 1,
          bymonthday: [1],
          byweekday: ['MO'],
          byhour: [1],
          byminute: [0],
        },
      ],
    ])('leaves %s to the YAML', (_name, rrule) => {
      expect(parseSchedule({ rrule })).toBeUndefined();
    });

    it('leaves a `with` it cannot write back unchanged to the YAML', () => {
      expect(parseSchedule({ every: '5m', other: 1 })).toBeUndefined();
      expect(parseSchedule({ every: 5 })).toBeUndefined();
      expect(parseSchedule('5m')).toBeUndefined();
    });
  });

  describe('validateSchedule', () => {
    it('accepts what the spec accepts for `every` and nothing shorter than a minute', () => {
      ['1m', '90s', '2h', '1d', ' 15m '].forEach((intervalText) =>
        expect(validateSchedule({ ...DEFAULT_SCHEDULE_DRAFT, intervalText })).toEqual({})
      );
      ['', '30s', '5', '1w', 'five minutes', '1.5h'].forEach((intervalText) =>
        expect(validateSchedule({ ...DEFAULT_SCHEDULE_DRAFT, intervalText })).toEqual({
          interval: true,
        })
      );
    });

    it('asks for a whole number of repeats, a time, and a day for the repeat chosen', () => {
      expect(validateSchedule(calendar())).toEqual({});
      expect(validateSchedule(calendar({ count: '0' }))).toEqual({ count: true });
      expect(validateSchedule(calendar({ count: '1.5' }))).toEqual({ count: true });
      expect(validateSchedule(calendar({ time: '' }))).toEqual({ time: true });
      expect(validateSchedule(calendar({ repeat: 'weekly', weeklyDays: [] }))).toEqual({
        days: true,
      });
      expect(validateSchedule(calendar({ repeat: 'daily', dailyDays: [] }))).toEqual({
        days: true,
      });
      expect(validateSchedule(calendar({ repeat: 'monthly', monthDays: [] }))).toEqual({
        monthDays: true,
      });
    });

    it('does not mind the days of a repeat that is not chosen', () => {
      expect(validateSchedule(calendar({ repeat: 'monthly', weeklyDays: [] }))).toEqual({});
    });

    it('does not check the calendar fields in interval mode', () => {
      expect(validateSchedule({ ...DEFAULT_SCHEDULE_DRAFT, count: '0', time: '' })).toEqual({});
    });
  });

  describe('scheduleToWith', () => {
    it('writes `every`, trimmed', () => {
      expect(scheduleToWith({ ...DEFAULT_SCHEDULE_DRAFT, intervalText: ' 15m ' })).toEqual({
        every: '15m',
      });
    });

    it('writes a weekly rrule with its days in week order', () => {
      expect(
        scheduleToWith(calendar({ repeat: 'weekly', weeklyDays: ['FR', 'MO'], time: '07:00' }))
      ).toEqual({
        rrule: {
          freq: 'WEEKLY',
          interval: 1,
          tzid: 'UTC',
          byweekday: ['MO', 'FR'],
          byhour: [7],
          byminute: [0],
        },
      });
    });

    it('writes no weekdays for a daily rule on every day, and the days otherwise', () => {
      expect(
        (scheduleToWith(calendar({ repeat: 'daily' })).rrule as Record<string, unknown>).byweekday
      ).toBeUndefined();
      expect(
        (
          scheduleToWith(calendar({ repeat: 'daily', dailyDays: ['MO', 'TU', 'WE', 'TH', 'FR'] }))
            .rrule as Record<string, unknown>
        ).byweekday
      ).toEqual(['MO', 'TU', 'WE', 'TH', 'FR']);
    });

    it('writes the days of the month, sorted, and the repeats as a number', () => {
      expect(
        scheduleToWith(
          calendar({ repeat: 'monthly', monthDays: [15, 1], count: '3', time: '09:05' })
        )
      ).toEqual({
        rrule: {
          freq: 'MONTHLY',
          interval: 3,
          tzid: 'UTC',
          bymonthday: [1, 15],
          byhour: [9],
          byminute: [5],
        },
      });
    });

    it('writes only the days of the repeat that is chosen', () => {
      const rrule = scheduleToWith(
        calendar({ repeat: 'weekly', weeklyDays: ['TU'], monthDays: [1], dailyDays: ['MO'] })
      ).rrule as Record<string, unknown>;

      expect(rrule.byweekday).toEqual(['TU']);
      expect(rrule).not.toHaveProperty('bymonthday');
    });

    it('round-trips what it reads', () => {
      const withValue = {
        rrule: {
          freq: 'MONTHLY',
          interval: 1,
          tzid: 'Europe/Madrid',
          bymonthday: [1, 15],
          byhour: [9],
          byminute: [5],
        },
      };
      const draft = parseSchedule(withValue);

      expect(draft && scheduleToWith(draft)).toEqual(withValue);
    });
  });
});
