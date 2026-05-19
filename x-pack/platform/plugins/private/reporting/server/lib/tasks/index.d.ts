import type { RruleSchedule, TaskRegisterDefinition } from '@kbn/task-manager-plugin/server';
import type { BasePayload, ReportSource } from '@kbn/reporting-common/types';
export declare const REPORTING_EXECUTE_TYPE = "report:execute";
export declare const SCHEDULED_REPORTING_EXECUTE_TYPE = "report:execute-scheduled";
export declare const TIME_BETWEEN_ATTEMPTS: number;
export { RunSingleReportTask } from './run_single_report';
export { RunScheduledReportTask } from './run_scheduled_report';
export interface ReportTaskParams<JobPayloadType = BasePayload> {
    id: string;
    index: string;
    payload: JobPayloadType;
    created_at: ReportSource['created_at'];
    created_by: ReportSource['created_by'];
    jobtype: ReportSource['jobtype'];
    attempts: ReportSource['attempts'];
    meta: ReportSource['meta'];
    useInternalUser?: boolean;
}
export interface ScheduledReportTaskParams {
    id: string;
    jobtype: ReportSource['jobtype'];
    spaceId: string;
    schedule: RruleSchedule;
}
export type ScheduledReportTaskParamsWithoutSpaceId = Omit<ScheduledReportTaskParams, 'spaceId'>;
export declare enum ReportingTaskStatus {
    UNINITIALIZED = "uninitialized",
    INITIALIZED = "initialized"
}
export interface ReportingTask {
    getTaskDefinition: () => TaskRegisterDefinition;
    getStatus: () => ReportingTaskStatus;
}
