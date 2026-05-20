import type { estypes } from '@elastic/elasticsearch';
import type { MlClient } from '../../lib/ml_client';
type ScheduledEvent = estypes.MlCalendarEvent;
interface BasicCalendar {
    job_ids: string[];
    description?: string;
    events: ScheduledEvent[];
}
export interface Calendar extends BasicCalendar {
    calendar_id: string;
}
export interface FormCalendar extends BasicCalendar {
    calendarId: string;
}
export declare class CalendarManager {
    private _mlClient;
    private _eventManager;
    constructor(mlClient: MlClient);
    getCalendar(calendarId: string): Promise<Calendar>;
    getAllCalendars(): Promise<Calendar[]>;
    /**
     * Gets a list of calendar objects based on provided ids.
     * @param calendarIds
     * @returns {Promise<*>}
     */
    getCalendarsByIds(calendarIds: string[]): Promise<Calendar[]>;
    newCalendar(calendar: FormCalendar): Promise<Calendar>;
    updateCalendar(calendarId: string, calendar: Calendar): Promise<Calendar>;
    deleteCalendar(calendarId: string): Promise<estypes.AcknowledgedResponseBase>;
}
export {};
