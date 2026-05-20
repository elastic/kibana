import type { LogMeta } from '@kbn/core/server';
import type { TaskRunMetrics } from '@kbn/reporting-common/types';
import type { ActionType } from '.';
export interface ReportingAction<A extends ActionType> extends LogMeta {
    event: {
        timezone: string;
        duration?: number;
    };
    message: string;
    kibana: {
        reporting: {
            actionType: A;
            id: string;
            jobType: string;
            byteSize?: number;
        } & TaskRunMetrics;
        task?: {
            id?: string;
        };
    };
    user?: {
        name: string;
    };
}
export interface ErrorAction {
    message: string;
    code?: string;
    stack_trace?: string;
    type?: string;
}
export type ScheduledTask = ReportingAction<ActionType.SCHEDULE_TASK>;
export type StartedExecution = ReportingAction<ActionType.EXECUTE_START>;
export type CompletedExecution = ReportingAction<ActionType.EXECUTE_COMPLETE>;
export type SavedReport = ReportingAction<ActionType.SAVE_REPORT>;
export type ClaimedTask = ReportingAction<ActionType.CLAIM_TASK>;
export type ScheduledRetry = ReportingAction<ActionType.RETRY>;
export type FailedReport = ReportingAction<ActionType.FAIL_REPORT>;
export type ExecuteError = ReportingAction<ActionType.EXECUTE_ERROR> & {
    error: ErrorAction;
};
