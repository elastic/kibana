/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlCalendarEvent, MlGetCalendarsResponse } from '@elastic/elasticsearch/lib/api/types';

/**
 * One calendar row used for usage aggregation. `getCalendars` does not include scheduled
 * events; Kibana loads them via `getCalendarEvents` and merges by `calendar_id` (same pattern
 * as `CalendarManager.getAllCalendars` in the ML plugin).
 */
export type MlGetCalendarsCalendarItem = MlGetCalendarsResponse['calendars'][number] & {
  events?: ReadonlyArray<Partial<MlCalendarEvent>>;
};

/**
 * Merges flat event list from `getCalendarEvents({ calendar_id: '_all' })` into calendars
 * from `getCalendars()`, matching server calendar manager behavior.
 */
export function attachEventsToCalendars(
  calendars: ReadonlyArray<MlGetCalendarsResponse['calendars'][number]>,
  events: ReadonlyArray<Partial<MlCalendarEvent>>
): MlGetCalendarsCalendarItem[] {
  const byCalendarId = new Map(
    calendars.map((cal) => [cal.calendar_id, { ...cal, events: [] as Partial<MlCalendarEvent>[] }])
  );

  for (const event of events) {
    const calId = event.calendar_id;
    if (calId === undefined) {
      continue;
    }
    const entry = byCalendarId.get(calId);
    if (entry) {
      entry.events.push(event);
    }
  }

  return [...byCalendarId.values()];
}

export interface MlCalendarsUsage {
  total_count: number;
  dst_calendars_count: number;
  standard_calendars_count: number;
  global_calendars_count: number;
  calendars_with_jobs_count: number;
  standard_events_count: number;
}

export const emptyCalendarsUsage = (): MlCalendarsUsage => ({
  total_count: 0,
  dst_calendars_count: 0,
  standard_calendars_count: 0,
  global_calendars_count: 0,
  calendars_with_jobs_count: 0,
  standard_events_count: 0,
});

export function aggregateCalendarsUsage(
  calendars: ReadonlyArray<MlGetCalendarsCalendarItem>
): MlCalendarsUsage {
  let dstCount = 0;
  let standardCount = 0;
  let globalCount = 0;
  let withJobsCount = 0;
  let standardEvents = 0;

  for (const cal of calendars) {
    const events = cal.events ?? [];
    const isDst = events.some((e) => e.force_time_shift !== undefined);

    if (isDst) {
      dstCount++;
    } else {
      standardCount++;
      standardEvents += events.length;
    }

    if (cal.job_ids.includes('_all')) {
      globalCount++;
    } else if (cal.job_ids.length > 0) {
      withJobsCount++;
    }
  }

  return {
    total_count: calendars.length,
    dst_calendars_count: dstCount,
    standard_calendars_count: standardCount,
    global_calendars_count: globalCount,
    calendars_with_jobs_count: withJobsCount,
    standard_events_count: standardEvents,
  };
}
