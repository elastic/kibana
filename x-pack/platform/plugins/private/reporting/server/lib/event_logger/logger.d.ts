import type { Logger, LogMeta } from '@kbn/core/server';
import type { TaskRunMetrics } from '@kbn/reporting-common/types';
import type { IReport } from '../store';
import type { ClaimedTask, CompletedExecution, ErrorAction, ExecuteError, FailedReport, SavedReport, ScheduledRetry, ScheduledTask, StartedExecution } from './types';
export interface ExecutionClaimMetrics extends TaskRunMetrics {
    queueDurationMs: number;
}
export interface ExecutionCompleteMetrics extends TaskRunMetrics {
    byteSize: number;
}
export interface IReportingEventLogger {
    logEvent(message: string, properties: LogMeta): void;
    startTiming(): void;
    stopTiming(): void;
}
export interface BaseEvent {
    event: {
        timezone: string;
    };
    kibana: {
        reporting: {
            id?: string;
            jobType: string;
        };
        task?: {
            id: string;
        };
    };
    user?: {
        name: string;
    };
}
export declare function reportingEventLoggerFactory(logger: Logger): {
    new (report: IReport, task?: {
        id: string;
    }): {
        readonly eventObj: BaseEvent;
        readonly report: IReport;
        readonly task?: {
            id: string;
        };
        completionLogger: IReportingEventLogger;
        logScheduleTask(): ScheduledTask;
        logExecutionStart(): StartedExecution;
        logExecutionComplete({ byteSize, csv, pdf, png, }: ExecutionCompleteMetrics): CompletedExecution;
        logError(error: ErrorAction): ExecuteError;
        logClaimTask({ queueDurationMs }: ExecutionClaimMetrics): ClaimedTask;
        logReportFailure(): FailedReport;
        logReportSaved(): SavedReport;
        logRetry(): ScheduledRetry;
    };
};
export type ReportingEventLogger = ReturnType<typeof reportingEventLoggerFactory>;
