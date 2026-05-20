import type { HttpSetup } from '@kbn/core-http-browser';
import type { RruleSchedule } from '@kbn/task-manager-plugin/server';
import type { RawNotification } from '../../../server/saved_objects/scheduled_report/schemas/latest';
import type { ScheduledReportingJobResponse } from '../../../server/types';
export interface ScheduleReportRequestParams {
    reportTypeId: string;
    jobParams: string;
    schedule?: RruleSchedule;
    notification?: RawNotification;
}
export declare const scheduleReport: ({ http, params: { reportTypeId, ...params }, }: {
    http: HttpSetup;
    params: ScheduleReportRequestParams;
}) => Promise<ScheduledReportingJobResponse>;
