/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlCalendar, MlCalendarEvent } from '@kbn/ml-common-types/calendars';

export type { MlCalendar };

/**
 * Shared test events used across calendar specs.
 * Ported from x-pack/platform/test/api_integration/apis/ml/calendars/helpers.ts.
 */
export const TEST_CALENDAR_EVENTS: readonly MlCalendarEvent[] = [
  { description: 'event 1', start_time: 1513641600000, end_time: 1513728000000 },
  { description: 'event 2', start_time: 1513814400000, end_time: 1513900800000 },
  { description: 'event 3', start_time: 1514160000000, end_time: 1514246400000 },
] as const;

/**
 * Asserts that every event in eventsToCheck is present in calendar.events,
 * matched by description, start_time, and end_time.
 * Throws with a descriptive message if any event is missing.
 */
export const assertAllEventsExistInCalendar = (
  eventsToCheck: readonly MlCalendarEvent[],
  calendar: Pick<MlCalendar, 'events'>
): void => {
  for (const e of eventsToCheck) {
    const found = calendar.events.some(
      (ce: MlCalendarEvent) =>
        ce.description === e.description &&
        Number(ce.start_time) === Number(e.start_time) &&
        Number(ce.end_time) === Number(e.end_time)
    );
    if (!found) {
      throw new Error(
        `Event "${e.description}" (${e.start_time}–${
          e.end_time
        }) not found in calendar events: ${JSON.stringify(calendar.events)}`
      );
    }
  }
};
