/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformCustomScheduleToRRule } from './v1';

describe('transformCustomScheduleToRRule', () => {
  it('transforms start and duration correctly', () => {
    expect(
      transformCustomScheduleToRRule({ duration: '2h', start: '2021-05-10T00:00:00.000Z' })
    ).toEqual({
      duration: 7200000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2021-05-10T00:00:00.000Z',
        freq: undefined,
        interval: undefined,
        tzid: 'UTC',
        until: undefined,
      },
    });
  });

  it('transforms start date and tzid correctly', () => {
    expect(
      transformCustomScheduleToRRule({
        duration: '1500s',
        start: '2025-02-10T21:30.00.000Z',
        timezone: 'America/New_York',
      })
    ).toEqual({
      duration: 1500000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2025-02-10T21:30.00.000Z',
        freq: undefined,
        interval: undefined,
        tzid: 'America/New_York',
        until: undefined,
      },
    });
  });

  it('transforms recurring with every correctly', () => {
    expect(
      transformCustomScheduleToRRule({
        duration: '30m',
        start: '2025-02-17T19:04:46.320Z',
        recurring: { every: '4w' },
      })
    ).toEqual({
      duration: 1800000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2025-02-17T19:04:46.320Z',
        freq: 2,
        interval: 4,
        tzid: 'UTC',
        until: undefined,
      },
    });
  });

  it('transforms recurring with weekday correctly', () => {
    expect(
      transformCustomScheduleToRRule({
        duration: '30m',
        start: '2025-02-17T19:04:46.320Z',
        recurring: { every: '1d', end: '2025-05-17T05:05:00.000Z', onWeekDay: ['MO', 'FR'] },
      })
    ).toEqual({
      duration: 1800000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: ['MO', 'FR'],
        count: undefined,
        dtstart: '2025-02-17T19:04:46.320Z',
        freq: 3,
        interval: 1,
        tzid: 'UTC',
        until: '2025-05-17T05:05:00.000Z',
      },
    });
  });

  it('transforms recurring with month and day correctly', () => {
    expect(
      transformCustomScheduleToRRule({
        duration: '5h',
        start: '2025-02-17T19:04:46.320Z',
        recurring: {
          every: '1M',
          end: '2025-12-17T05:05:00.000Z',
          onMonthDay: [1, 31],
          onMonth: [1, 3, 5],
        },
      })
    ).toEqual({
      duration: 18000000,
      rRule: {
        bymonth: [1, 3, 5],
        bymonthday: [1, 31],
        byweekday: undefined,
        count: undefined,
        dtstart: '2025-02-17T19:04:46.320Z',
        freq: 1,
        interval: 1,
        tzid: 'UTC',
        until: '2025-12-17T05:05:00.000Z',
      },
    });
  });

  it('transforms recurring with occurrences correctly', () => {
    expect(
      transformCustomScheduleToRRule({
        duration: '300s',
        start: '2025-01-14T05:05:00.000Z',
        recurring: { every: '2w', occurrences: 3 },
      })
    ).toEqual({
      duration: 300000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: 3,
        dtstart: '2025-01-14T05:05:00.000Z',
        freq: 2,
        interval: 2,
        tzid: 'UTC',
        until: undefined,
      },
    });
  });

  it('transforms duration to 0 when incorrect', () => {
    expect(
      transformCustomScheduleToRRule({
        duration: '1y',
        start: '2025-01-14T05:05:00.000Z',
      })
    ).toEqual({
      duration: 0,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2025-01-14T05:05:00.000Z',
        freq: undefined,
        interval: undefined,
        tzid: 'UTC',
        until: undefined,
      },
    });
  });

  it('transforms frequency and interval to undefined when incorrect', () => {
    expect(
      transformCustomScheduleToRRule({
        duration: '1m',
        start: '2025-01-14T05:05:00.000Z',
        recurring: { every: '-1h' },
      })
    ).toEqual({
      duration: 60000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2025-01-14T05:05:00.000Z',
        freq: undefined,
        interval: undefined,
        tzid: 'UTC',
        until: undefined,
      },
    });
  });
});
