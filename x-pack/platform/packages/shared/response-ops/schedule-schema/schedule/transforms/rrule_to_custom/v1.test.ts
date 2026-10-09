/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRRuleToCustomSchedule } from './v1';

describe('transformRRuleToCustomSchedule', () => {
  it('transforms to start and duration correctly', () => {
    expect(
      transformRRuleToCustomSchedule({
        duration: 7200000,
        rRule: {
          dtstart: '2021-05-10T00:00:00.000Z',
          tzid: 'UTC',
        },
      })
    ).toEqual({ duration: '2h', start: '2021-05-10T00:00:00.000Z', timezone: 'UTC' });
  });

  it('transforms duration to ms correctly', () => {
    expect(
      transformRRuleToCustomSchedule({
        duration: 7200325,
        rRule: {
          dtstart: '2021-05-10T00:00:00.000Z',
          tzid: 'UTC',
        },
      })
    ).toEqual({ duration: '7200325ms', start: '2021-05-10T00:00:00.000Z', timezone: 'UTC' });
  });

  it('transforms to start date and timezone correctly', () => {
    expect(
      transformRRuleToCustomSchedule({
        duration: 1500000,
        rRule: {
          dtstart: '2025-02-10T21:30:00.000Z',
          tzid: 'America/New_York',
        },
      })
    ).toEqual({
      duration: '25m',
      start: '2025-02-10T21:30:00.000Z',
      timezone: 'America/New_York',
    });
  });

  it('transforms to recurring with every correctly', () => {
    expect(
      transformRRuleToCustomSchedule({
        duration: 1800000,
        rRule: {
          byweekday: ['MO', 'FR'],
          dtstart: '2025-02-17T19:04:46.320Z',
          freq: 1,
          interval: 6,
          tzid: 'UTC',
          until: '2025-05-17T05:05:00.000Z',
        },
      })
    ).toEqual({
      duration: '30m',
      start: '2025-02-17T19:04:46.320Z',
      recurring: { every: '6M', end: '2025-05-17T05:05:00.000Z', onWeekDay: ['MO', 'FR'] },
      timezone: 'UTC',
    });
  });

  it('transforms to recurring with weekday correctly', () => {
    expect(
      transformRRuleToCustomSchedule({
        duration: 1800000,
        rRule: {
          byweekday: ['MO', 'FR'],
          dtstart: '2025-02-17T19:04:46.320Z',
          freq: 3,
          interval: 1,
          tzid: 'UTC',
          until: '2025-05-17T05:05:00.000Z',
        },
      })
    ).toEqual({
      duration: '30m',
      start: '2025-02-17T19:04:46.320Z',
      recurring: { every: '1d', end: '2025-05-17T05:05:00.000Z', onWeekDay: ['MO', 'FR'] },
      timezone: 'UTC',
    });
  });

  it('transforms to recurring with month and day correctly', () => {
    expect(
      transformRRuleToCustomSchedule({
        duration: 18000000,
        rRule: {
          bymonth: [1, 3, 5],
          bymonthday: [1, 31],
          dtstart: '2025-02-17T19:04:46.320Z',
          freq: 1,
          interval: 1,
          tzid: 'UTC',
          until: '2025-12-17T05:05:00.000Z',
        },
      })
    ).toEqual({
      duration: '5h',
      start: '2025-02-17T19:04:46.320Z',
      recurring: {
        every: '1M',
        end: '2025-12-17T05:05:00.000Z',
        onMonthDay: [1, 31],
        onMonth: [1, 3, 5],
      },
      timezone: 'UTC',
    });
  });

  it('transforms to recurring with occurrences correctly', () => {
    expect(
      transformRRuleToCustomSchedule({
        duration: 300000,
        rRule: {
          count: 3,
          dtstart: '2025-01-14T05:05:00.000Z',
          freq: 2,
          interval: 2,
          tzid: 'UTC',
        },
      })
    ).toEqual({
      duration: '5m',
      start: '2025-01-14T05:05:00.000Z',
      recurring: { every: '2w', occurrences: 3 },
      timezone: 'UTC',
    });
  });
});
