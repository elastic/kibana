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
export declare function attachEventsToCalendars(calendars: ReadonlyArray<MlGetCalendarsResponse['calendars'][number]>, events: ReadonlyArray<Partial<MlCalendarEvent>>): MlGetCalendarsCalendarItem[];
export interface MlCalendarsUsage {
    total_count: number;
    dst_calendars_count: number;
    standard_calendars_count: number;
    global_calendars_count: number;
    calendars_with_jobs_count: number;
    standard_events_count: number;
}
export declare const emptyCalendarsUsage: () => MlCalendarsUsage;
export declare function aggregateCalendarsUsage(calendars: ReadonlyArray<MlGetCalendarsCalendarItem>): MlCalendarsUsage;
