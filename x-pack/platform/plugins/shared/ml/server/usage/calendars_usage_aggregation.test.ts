/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  aggregateCalendarsUsage,
  attachEventsToCalendars,
  emptyCalendarsUsage,
} from './calendars_usage_aggregation';

describe('emptyCalendarsUsage', () => {
  it('returns all zeroes', () => {
    expect(emptyCalendarsUsage()).toEqual({
      total_count: 0,
      dst_calendars_count: 0,
      standard_calendars_count: 0,
      global_calendars_count: 0,
      calendars_with_jobs_count: 0,
      standard_events_count: 0,
    });
  });
});

describe('attachCalendarEventsToCalendars', () => {
  it('merges events onto calendars by calendar_id', () => {
    const calendars = [
      { calendar_id: 'cal-a', job_ids: ['job-1'] as string[] },
      { calendar_id: 'cal-b', job_ids: [] as string[] },
    ];
    const events = [
      { calendar_id: 'cal-a', description: 'e1' },
      { calendar_id: 'cal-a', description: 'e2' },
      { calendar_id: 'cal-b', description: 'e3' },
    ];
    const merged = attachEventsToCalendars(calendars, events);
    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.calendar_id === 'cal-a')?.events).toHaveLength(2);
    expect(merged.find((c) => c.calendar_id === 'cal-b')?.events).toHaveLength(1);
    expect(aggregateCalendarsUsage(merged).standard_events_count).toBe(3);
  });

  it('ignores events with missing calendar_id or unknown calendar_id', () => {
    const calendars = [{ calendar_id: 'cal-a', job_ids: [] as string[] }];
    const events = [
      { description: 'no cal id' },
      { calendar_id: 'unknown', description: 'x' },
      { calendar_id: 'cal-a', description: 'ok' },
    ];
    const merged = attachEventsToCalendars(calendars, events);
    expect(merged[0].events).toHaveLength(1);
  });
});

describe('aggregateCalendarsUsage', () => {
  it('returns zeroes for empty calendars array', () => {
    expect(aggregateCalendarsUsage([])).toEqual(emptyCalendarsUsage());
  });

  it('counts a standard calendar with events and assigned jobs', () => {
    const calendars = [
      {
        calendar_id: 'calendarId1',
        description: 'holiday',
        job_ids: ['job-1', 'job-2'],
        events: [{ description: 'holiday' }, { description: 'maintenance' }],
      },
    ];

    expect(aggregateCalendarsUsage(calendars)).toEqual({
      total_count: 1,
      dst_calendars_count: 0,
      standard_calendars_count: 1,
      global_calendars_count: 0,
      calendars_with_jobs_count: 1,
      standard_events_count: 2,
    });
  });

  it('identifies DST calendars by the force_time_shift field on any event', () => {
    const calendars = [
      {
        calendar_id: 'dst-cal',
        job_ids: ['job-1'],
        events: [
          { description: 'Summer 2025', force_time_shift: 3600 },
          { description: 'Winter 2025', force_time_shift: -3600 },
        ],
      },
    ];

    expect(aggregateCalendarsUsage(calendars)).toEqual({
      total_count: 1,
      dst_calendars_count: 1,
      standard_calendars_count: 0,
      global_calendars_count: 0,
      calendars_with_jobs_count: 1,
      standard_events_count: 0,
    });
  });

  it('does not count DST calendar events in standard_events_count', () => {
    const calendars = [
      {
        calendar_id: 'std-cal',
        job_ids: ['job-1'],
        events: [{ description: 'holiday' }],
      },
      {
        calendar_id: 'dst-cal',
        job_ids: ['job-2'],
        events: [
          { description: 'Summer 2025', force_time_shift: 3600 },
          { description: 'Winter 2025', force_time_shift: -3600 },
        ],
      },
    ];

    const result = aggregateCalendarsUsage(calendars);
    expect(result.standard_events_count).toBe(1);
    expect(result.dst_calendars_count).toBe(1);
    expect(result.standard_calendars_count).toBe(1);
  });

  it('identifies global calendars by _all in job_ids', () => {
    const calendars = [
      { calendar_id: 'global-cal', job_ids: ['_all'], events: [] },
      { calendar_id: 'jobs-cal', job_ids: ['job-1'], events: [{ description: 'ev' }] },
    ];

    const result = aggregateCalendarsUsage(calendars);
    expect(result.global_calendars_count).toBe(1);
    expect(result.calendars_with_jobs_count).toBe(1);
  });

  it('counts calendars with no jobs separately from global and with-jobs calendars', () => {
    const calendars = [
      { calendar_id: 'empty-cal', job_ids: [], events: [] },
      { calendar_id: 'global-cal', job_ids: ['_all'], events: [] },
      { calendar_id: 'jobs-cal', job_ids: ['job-1'], events: [] },
    ];

    const result = aggregateCalendarsUsage(calendars);
    expect(result.total_count).toBe(3);
    expect(result.global_calendars_count).toBe(1);
    expect(result.calendars_with_jobs_count).toBe(1);
  });

  it('handles calendars with no events field', () => {
    const calendars = [{ calendar_id: 'no-events-cal', job_ids: ['job-1'] }];
    const result = aggregateCalendarsUsage(calendars);
    expect(result.standard_calendars_count).toBe(1);
    expect(result.dst_calendars_count).toBe(0);
    expect(result.standard_events_count).toBe(0);
  });

  it('aggregates mixed standard and DST calendars correctly', () => {
    const calendars = [
      {
        calendar_id: 'global-std',
        job_ids: ['_all'],
        events: [{ description: 'holiday-1' }, { description: 'holiday-2' }],
      },
      {
        calendar_id: 'dst-cal',
        job_ids: ['job-a'],
        events: [{ description: 'Summer 2025', force_time_shift: 3600 }],
      },
      {
        calendar_id: 'jobs-std',
        job_ids: ['job-b', 'job-c'],
        events: [{ description: 'maintenance' }],
      },
      {
        calendar_id: 'empty-cal',
        job_ids: [],
        events: [],
      },
    ];

    expect(aggregateCalendarsUsage(calendars)).toEqual({
      total_count: 4,
      dst_calendars_count: 1,
      standard_calendars_count: 3,
      global_calendars_count: 1,
      calendars_with_jobs_count: 2,
      standard_events_count: 3,
    });
  });
});
