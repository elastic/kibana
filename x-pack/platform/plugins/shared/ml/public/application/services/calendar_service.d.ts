import type { MlCalendar, MlCalendarId } from '@kbn/ml-common-types/calendars';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from './ml_api_service';
declare class CalendarService {
    /**
     * Assigns a job id to the calendar.
     * @param calendar
     * @param jobId
     */
    assignNewJobId(mlApi: MlApi, calendar: MlCalendar, jobId: JobId): Promise<void>;
    /**
     * Fetches calendars by the list of ids.
     * @param calendarIds
     */
    fetchCalendarsByIds(mlApi: MlApi, calendarIds: MlCalendarId[]): Promise<MlCalendar[]>;
}
export declare const mlCalendarService: CalendarService;
export {};
