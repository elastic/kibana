/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformSchedule } from './v1';

describe('transformSchedule', () => {
  it('transforms start and duration correctly', () => {
    expect(transformSchedule({ duration: '2h', start: '2021-05-10T00:00:00.000Z' })).toEqual({
      duration: 7200000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2021-05-10T00:00:00.000Z',
        freq: undefined,
        interval: undefined,
        tzid: 'Africa/Abidjan',
        until: undefined,
      },
    });
  });

  it('transforms duration as indefinite correctly', () => {
    expect(transformSchedule({ duration: '-1', start: '2021-05-10T00:00:00.000Z' })).toEqual({
      duration: -1,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2021-05-10T00:00:00.000Z',
        freq: undefined,
        interval: undefined,
        tzid: 'Africa/Abidjan',
        until: undefined,
      },
    });
  });

  it('transforms start date and tzid correctly', () => {
    expect(
      transformSchedule({ duration: '1500s', start: '2025-02-10T21:30:00.000+05:30' })
    ).toEqual({
      duration: 1500000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2025-02-10T21:30:00.000+05:30',
        freq: undefined,
        interval: undefined,
        tzid: 'America/New_York',
        until: undefined,
      },
    });
  });

  it('transforms start date without timezone correctly', () => {
    expect(transformSchedule({ duration: '500s', start: '2025-01-02T00:00:00.000' })).toEqual({
      duration: 500000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: undefined,
        count: undefined,
        dtstart: '2025-01-02T00:00:00.000',
        freq: undefined,
        interval: undefined,
        tzid: 'Africa/Abidjan',
        until: undefined,
      },
    });
  });

  it('transforms recurring with weekday correctly', () => {
    expect(
      transformSchedule({
        duration: '30m',
        start: '2025-02-17T19:04:46.320Z',
        recurring: { every: '1d', end: '2025-05-17T05:05:00.000Z', onWeekDay: ['Mo', 'FR'] },
      })
    ).toEqual({
      duration: 1800000,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: ['Mo', 'FR'],
        count: undefined,
        dtstart: '2025-02-17T19:04:46.320Z',
        freq: 3,
        interval: 1,
        tzid: 'Africa/Abidjan',
        until: '2025-05-17T05:05:00.000Z',
      },
    });
  });

  it('transforms recurring with month and day correctly', () => {
    expect(
      transformSchedule({
        duration: '5h',
        start: '2025-02-17T19:04:46.320Z',
        recurring: {
          every: '1m',
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
        tzid: 'Africa/Abidjan',
        until: '2025-12-17T05:05:00.000Z',
      },
    });
  });

  it('transforms recurring with occurrences correctly', () => {
    expect(
      transformSchedule({
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
        tzid: 'Africa/Abidjan',
        until: undefined,
      },
    });
  });

  it('transforms duration to 0 when incorrect', () => {
    expect(
      transformSchedule({
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
        tzid: 'Africa/Abidjan',
        until: undefined,
      },
    });
  });

  it('transforms frequency and interval to undefined when incorrect', () => {
    expect(
      transformSchedule({
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
        tzid: 'Africa/Abidjan',
        until: undefined,
      },
    });
  });
});
