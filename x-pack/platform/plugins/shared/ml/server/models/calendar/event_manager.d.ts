import type { estypes } from '@elastic/elasticsearch';
import type { MlClient } from '../../lib/ml_client';
type ScheduledEvent = estypes.MlCalendarEvent;
export declare class EventManager {
    private _mlClient;
    constructor(mlClient: MlClient);
    getCalendarEvents(calendarId: string): Promise<estypes.MlCalendarEvent[]>;
    getAllEvents(jobId?: string): Promise<estypes.MlCalendarEvent[]>;
    addEvents(calendarId: string, events: ScheduledEvent[]): Promise<estypes.MlPostCalendarEventsResponse>;
    deleteEvent(calendarId: string, eventId: string): Promise<estypes.AcknowledgedResponseBase>;
    isEqual(ev1: ScheduledEvent, ev2: ScheduledEvent): boolean;
}
export {};
