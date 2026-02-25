/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import { intervalScheduleSchema, scheduleSchema } from './v1';

describe('intervalScheduleSchema', () => {
  it('validates a valid interval schedule', () => {
    expect(intervalScheduleSchema.validate({ interval: '1m' })).toEqual({ interval: '1m' });
    expect(intervalScheduleSchema.validate({ interval: '1h' })).toEqual({ interval: '1h' });
    expect(intervalScheduleSchema.validate({ interval: '7d' })).toEqual({ interval: '7d' });
  });

  it('throws when interval is missing', () => {
    expect(() => intervalScheduleSchema.validate({})).toThrow();
  });

  it('throws when interval is not a string', () => {
    expect(() => intervalScheduleSchema.validate({ interval: 60 })).toThrow();
  });
});

describe('scheduleSchema', () => {
  describe('interval branch', () => {
    it('validates a valid interval schedule', () => {
      expect(scheduleSchema.validate({ interval: '5m' })).toEqual({ interval: '5m' });
    });
  });

  describe('rrule branch', () => {
    const baseRrule = {
      freq: Frequency.DAILY,
      interval: 1,
      tzid: 'UTC',
    };

    it('validates monthly rrule with optional by* fields', () => {
      const schedule = {
        rrule: {
          freq: Frequency.MONTHLY,
          interval: 1,
          tzid: 'America/New_York',
          dtstart: '2024-01-01T00:00:00.000Z',
          byhour: [9],
          byminute: [0],
          byweekday: ['MO', 'TU'],
          bymonthday: [1, 15],
        },
      };
      expect(scheduleSchema.validate(schedule)).toEqual(schedule);
    });

    it('validates weekly rrule without bymonthday', () => {
      const schedule = {
        rrule: {
          freq: Frequency.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byhour: [10],
          byminute: [30],
          byweekday: ['WE', 'FR'],
        },
      };
      expect(scheduleSchema.validate(schedule)).toEqual(schedule);
    });

    it('validates daily rrule', () => {
      const schedule = {
        rrule: {
          freq: Frequency.DAILY,
          interval: 2,
          tzid: 'Europe/London',
          byhour: [8],
          byminute: [0],
          byweekday: ['MO'],
        },
      };
      expect(scheduleSchema.validate(schedule)).toEqual(schedule);
    });

    it('validates hourly rrule with only byminute', () => {
      const schedule = {
        rrule: {
          freq: Frequency.HOURLY,
          interval: 1,
          tzid: 'UTC',
          byminute: [0, 30],
        },
      };
      expect(scheduleSchema.validate(schedule)).toEqual(schedule);
    });

    it('validates minimal rrule (required fields only)', () => {
      const schedule = {
        rrule: {
          freq: Frequency.DAILY,
          interval: 1,
          tzid: 'UTC',
        },
      };
      expect(scheduleSchema.validate(schedule)).toEqual(schedule);
    });

    it('throws when freq is invalid', () => {
      expect(() =>
        scheduleSchema.validate({
          rrule: { ...baseRrule, freq: 99 },
        })
      ).toThrow();
    });

    it('throws when interval is less than 1', () => {
      expect(() =>
        scheduleSchema.validate({
          rrule: { ...baseRrule, interval: 0 },
        })
      ).toThrow();
    });

    it('throws when byminute has value out of range', () => {
      expect(() =>
        scheduleSchema.validate({
          rrule: {
            ...baseRrule,
            freq: Frequency.HOURLY,
            byminute: [60],
          },
        })
      ).toThrow();
    });

    it('throws when byhour has value out of range', () => {
      expect(() =>
        scheduleSchema.validate({
          rrule: {
            ...baseRrule,
            freq: Frequency.WEEKLY,
            byhour: [24],
          },
        })
      ).toThrow();
    });

    it('throws when bymonthday has value out of range', () => {
      expect(() =>
        scheduleSchema.validate({
          rrule: {
            ...baseRrule,
            freq: Frequency.MONTHLY,
            bymonthday: [0],
          },
        })
      ).toThrow();

      expect(() =>
        scheduleSchema.validate({
          rrule: {
            ...baseRrule,
            freq: Frequency.MONTHLY,
            bymonthday: [32],
          },
        })
      ).toThrow();
    });

    it('throws when weekly rrule includes bymonthday', () => {
      expect(() =>
        scheduleSchema.validate({
          rrule: {
            freq: Frequency.WEEKLY,
            interval: 1,
            tzid: 'UTC',
            bymonthday: [1],
          },
        })
      ).toThrow();
    });

    it('throws when hourly rrule includes byhour', () => {
      expect(() =>
        scheduleSchema.validate({
          rrule: {
            freq: Frequency.HOURLY,
            interval: 1,
            tzid: 'UTC',
            byhour: [9],
          },
        })
      ).toThrow();
    });

    it('throws when rrule is missing required fields', () => {
      expect(() => scheduleSchema.validate({ rrule: {} })).toThrow();
      expect(() =>
        scheduleSchema.validate({
          rrule: { freq: Frequency.DAILY, tzid: 'UTC' },
        })
      ).toThrow();
    });

    it('throws when input is neither interval nor rrule', () => {
      expect(() => scheduleSchema.validate({ unknown: true })).toThrow();
      expect(() => scheduleSchema.validate(null)).toThrow();
    });
  });
});
