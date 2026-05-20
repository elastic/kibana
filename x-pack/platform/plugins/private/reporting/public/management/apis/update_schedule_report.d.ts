import type { HttpSetup } from '@kbn/core-http-browser';
import type { RruleSchedule } from '@kbn/task-manager-plugin/server';
import type { RawNotification } from '../../../server/saved_objects/scheduled_report/schemas/latest';
import type { ScheduledReportingJobResponse } from '../../../server/types';
export interface UpdateScheduleReportRequestParams {
    reportId: string;
    title?: string;
    schedule?: RruleSchedule;
    notification?: RawNotification;
}
export declare const updateScheduleReport: ({ http, params: { reportId, title, schedule, notification }, }: {
    http: HttpSetup;
    params: UpdateScheduleReportRequestParams;
}) => Promise<ScheduledReportingJobResponse>;
