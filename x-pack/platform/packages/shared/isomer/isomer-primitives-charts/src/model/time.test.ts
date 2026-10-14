/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  defaultGranularity,
  formatTime,
  isoTime,
  timeAxisIssues,
  timeKindRule,
  timeRule,
  timeSpellingRule,
  timeValue,
  timeZoneSchema,
} from './time';

describe('isoTime', () => {
  const accepts = (value: string) => isoTime().safeParse(value).success;

  it.each([
    '2026-10-14',
    '2026-10-14T09:30Z',
    '2026-10-14T09:30:00Z',
    '2026-10-14T09:30:00.123Z',
    '2026-10-14T09:30:00+02:00',
    '2024-02-29',
  ])('accepts %s', (value) => {
    expect(accepts(value)).toBe(true);
  });

  it.each([
    'Mon',
    '09:00',
    '2026-10-14T09:30:00',
    '2026-13-01',
    '2025-02-29',
    '2026-10-14 09:30:00Z',
    '1760434200000',
  ])('refuses %s', (value) => {
    expect(accepts(value)).toBe(false);
  });

  it('runs in linear time on a long hostile string', () => {
    const started = performance.now();
    expect(accepts(`2026-10-14T09:30:00.${'1'.repeat(9_000)}`)).toBe(false);
    expect(performance.now() - started).toBeLessThan(50);
  });
});

describe('timeZoneSchema', () => {
  it('takes IANA names and refuses others', () => {
    expect(timeZoneSchema().safeParse('Europe/Amsterdam').success).toBe(true);
    expect(timeZoneSchema().safeParse('UTC').success).toBe(true);
    expect(timeZoneSchema().safeParse('Mars/Olympus').success).toBe(false);
  });
});

describe('formatTime', () => {
  it('prints an instant in the given zone at the given granularity', () => {
    expect(
      formatTime('2026-10-14T08:00:00Z', {
        timeZone: 'Europe/Amsterdam',
        granularity: 'minute',
      })
    ).toBe('Oct 14, 10:00');
    expect(
      formatTime('2026-10-14T08:00:00Z', {
        timeZone: 'UTC',
        granularity: 'day',
      })
    ).toBe('Oct 14, 2026');
    expect(
      formatTime('2026-10-14T08:00:00Z', {
        timeZone: 'UTC',
        granularity: 'month',
      })
    ).toBe('Oct 2026');
  });

  it('never moves a calendar date to a neighbouring day', () => {
    expect(
      formatTime('2026-10-14', {
        timeZone: 'Pacific/Kiritimati',
        granularity: 'day',
      })
    ).toBe('Oct 14, 2026');
    expect(
      formatTime('2026-10-14', {
        timeZone: 'Pacific/Pago_Pago',
        granularity: 'day',
      })
    ).toBe('Oct 14, 2026');
  });

  it('orders equal instants written with different offsets as equal', () => {
    expect(timeValue('2026-10-14T10:00:00+02:00')).toBe(timeValue('2026-10-14T08:00:00Z'));
  });
});

describe('timeAxisIssues', () => {
  it('refuses a value that is not a real time, such as February 30th', () => {
    expect(timeAxisIssues(['2026-02-28', '2026-02-30'])).toEqual([{ index: 1, rule: timeRule }]);
  });

  it('keeps one axis to dates or to date-times', () => {
    expect(timeAxisIssues(['2026-10-14', '2026-10-15'])).toEqual([]);
    expect(timeAxisIssues(['2026-10-14', '2026-10-14T12:00:00Z'])).toEqual([
      { index: 1, rule: timeKindRule },
    ]);
  });

  it('writes one moment one way', () => {
    expect(timeAxisIssues(['2026-10-14T09:00:00Z', '2026-10-14T09:00:00Z'])).toEqual([]);
    expect(timeAxisIssues(['2026-10-14T09:00:00Z', '2026-10-14T11:00:00+02:00'])).toEqual([
      { index: 1, rule: timeSpellingRule },
    ]);
  });
});

describe('defaultGranularity', () => {
  it('prints an axis of dates by day and anything else by minute', () => {
    expect(defaultGranularity(['2026-10-14', '2026-10-15'])).toBe('day');
    expect(defaultGranularity(['2026-10-14T09:00:00Z'])).toBe('minute');
    expect(defaultGranularity([])).toBe('minute');
  });
});
