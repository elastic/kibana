import type { estypes } from '@elastic/elasticsearch';
export type MlCalendarId = string;
export interface MlCalendar {
    calendar_id: MlCalendarId;
    description: string;
    events: any[];
    job_ids: string[];
    total_job_count?: number;
}
export interface UpdateCalendar extends MlCalendar {
    calendarId: MlCalendarId;
}
export type MlCalendarEvent = estypes.MlCalendarEvent & {
    force_time_shift?: number;
    skip_result?: boolean;
    skip_model_update?: boolean;
};
