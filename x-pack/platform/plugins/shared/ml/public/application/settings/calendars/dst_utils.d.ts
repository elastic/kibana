import type { Moment } from 'moment-timezone';
import type { MlCalendar, MlCalendarEvent } from '@kbn/ml-common-types/calendars';
export declare function getDSTChangeDates(timezone: string, year: number): {
    start: Moment | null;
    end: Moment | null;
    year: number;
};
export declare function createDstEvents(timezone: string): MlCalendarEvent[];
export declare function isDstCalendar(calendar: MlCalendar): boolean;
export declare function filterCalendarsForDst(calendars: MlCalendar[], isDst: boolean): MlCalendar[];
export declare function separateCalendarsByType(allCalendars: MlCalendar[]): {
    calendarsDst: MlCalendar[];
    calendars: MlCalendar[];
};
export declare function generateTimeZones(): string[];
