import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { JOB_STATUS } from '@kbn/reporting-common';
import type { ExecutionError, ReportDocument, ReportOutput } from '@kbn/reporting-common/types';
import type { Report } from '.';
import { SavedReport } from '.';
import type { ReportingCore } from '../..';
import type { ReportTaskParams } from '../tasks';
type UpdateResponse<T> = estypes.UpdateResponse<T>;
export type ReportProcessingFields = Required<{
    kibana_id: Report['kibana_id'];
    kibana_name: Report['kibana_name'];
    attempts: Report['attempts'];
    started_at: Report['started_at'];
    max_attempts: Report['max_attempts'];
    timeout: Report['timeout'];
    process_expiration: Report['process_expiration'];
}>;
export interface ReportFailedFields {
    output: ReportOutput | null;
    completed_at?: Report['completed_at'];
    error?: ExecutionError | unknown;
}
export type ReportCompletedFields = Required<{
    completed_at: Report['completed_at'];
    output: Omit<ReportOutput, 'content'> | null;
}>;
export interface ReportWarningFields {
    output: Omit<ReportOutput, 'content'>;
    warning: string;
}
export interface ReportRecordTimeout {
    _id: string;
    _index: string;
    _source: {
        status: JOB_STATUS;
        process_expiration?: string;
    };
}
export declare class ReportingStore {
    private reportingCore;
    private logger;
    private client?;
    constructor(reportingCore: ReportingCore, logger: Logger);
    private getClient;
    protected createIlmPolicy(): Promise<void>;
    private indexReport;
    /**
     * Function to be called during plugin start phase. This ensures the environment is correctly
     * configured for storage of reports.
     */
    start(): Promise<void>;
    addReport(report: Report): Promise<SavedReport>;
    findReportFromTask(taskJson: Pick<ReportTaskParams, 'id' | 'index'>): Promise<SavedReport>;
    setReportClaimed(report: SavedReport, processingInfo: ReportProcessingFields): Promise<UpdateResponse<ReportDocument>>;
    private logError;
    setReportFailed(report: SavedReport, failedInfo: ReportFailedFields): Promise<UpdateResponse<ReportDocument>>;
    setReportError(report: SavedReport, errorInfo: Pick<ReportFailedFields, 'error' | 'output'>): Promise<UpdateResponse<ReportDocument>>;
    setReportCompleted(report: SavedReport, completedInfo: ReportCompletedFields): Promise<UpdateResponse<ReportDocument>>;
    setReportWarning(report: SavedReport, warningInfo: ReportWarningFields): Promise<UpdateResponse<ReportDocument>>;
}
export {};
