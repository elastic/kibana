/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SCHEDULE_DRAFT, type ScheduleDraft } from './scheduled_trigger_model';
import { describeSchedule } from './scheduled_trigger_summary';

const calendar = (overrides: Partial<ScheduleDraft> = {}): ScheduleDraft => ({
  ...DEFAULT_SCHEDULE_DRAFT,
  mode: 'calendar',
  ...overrides,
});

describe('describeSchedule', () => {
  it.each([
    ['1m', 'Runs every minute.'],
    ['5m', 'Runs every 5 minutes.'],
    ['90s', 'Runs every 90 seconds.'],
    ['2h', 'Runs every 2 hours.'],
    ['1d', 'Runs every day.'],
  ])('describes an interval of %s', (intervalText, expected) => {
    expect(describeSchedule({ ...DEFAULT_SCHEDULE_DRAFT, intervalText })).toBe(expected);
  });

  it('describes a daily schedule on every day, on weekdays, and on chosen days', () => {
    expect(describeSchedule(calendar({ repeat: 'daily' }))).toBe('Every day at 08:00 UTC.');
    expect(
      describeSchedule(calendar({ repeat: 'daily', dailyDays: ['MO', 'TU', 'WE', 'TH', 'FR'] }))
    ).toBe('Every weekday at 08:00 UTC.');
    expect(describeSchedule(calendar({ repeat: 'daily', dailyDays: ['MO', 'FR'] }))).toBe(
      'Every Monday and Friday at 08:00 UTC.'
    );
  });

  it('describes a daily schedule that repeats every few days', () => {
    expect(describeSchedule(calendar({ repeat: 'daily', count: '2' }))).toBe(
      'Every 2 days at 08:00 UTC.'
    );
    expect(
      describeSchedule(calendar({ repeat: 'daily', count: '2', dailyDays: ['MO', 'FR'] }))
    ).toBe('Every 2 days, on Monday and Friday, at 08:00 UTC.');
  });

  it('describes a weekly schedule', () => {
    expect(describeSchedule(calendar({ weeklyDays: ['WE'], time: '07:30' }))).toBe(
      'Every week on Wednesday at 07:30 UTC.'
    );
    expect(
      describeSchedule(
        calendar({ count: '2', weeklyDays: ['MO', 'WE', 'FR'], tzid: 'Europe/Madrid' })
      )
    ).toBe('Every 2 weeks on Monday, Wednesday, and Friday at 08:00 Europe/Madrid.');
  });

  it('describes a monthly schedule with ordinal days', () => {
    expect(describeSchedule(calendar({ repeat: 'monthly', monthDays: [1, 15, 22, 3] }))).toBe(
      'Every month on the 1st, the 3rd, the 15th, and the 22nd at 08:00 UTC.'
    );
  });

  it('says nothing while the draft has errors', () => {
    expect(describeSchedule({ ...DEFAULT_SCHEDULE_DRAFT, intervalText: '30s' })).toBe('');
    expect(describeSchedule(calendar({ weeklyDays: [] }))).toBe('');
  });
});
