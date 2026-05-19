import moment from 'moment';
import type { Writable } from 'stream';
import type { Headers } from '@kbn/core-http-server';
import type { UpdateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, Logger, SavedObject } from '@kbn/core/server';
import type { ReportingError } from '@kbn/reporting-common';
import { CancellationToken } from '@kbn/reporting-common';
import type { ReportDocument, ReportOutput, TaskInstanceFields, TaskRunResult } from '@kbn/reporting-common/types';
import { type ReportingConfigType } from '@kbn/reporting-server';
import { type ConcreteTaskInstance, type TaskManagerStartContract, type TaskRegisterDefinition, type TaskRunCreatorFunction } from '@kbn/task-manager-plugin/server';
import type { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import type { ReportTaskParams, ReportingTask } from '.';
import { ReportingTaskStatus } from '.';
import type { ReportingCore } from '../..';
import type { EventTracker } from '../../usage';
import type { SavedReport } from '../store';
import { Report } from '../store';
import type { EmailNotificationService } from '../../services/notifications/email_notification_service';
import type { ScheduledReportType } from '../../types';
type CompletedReportOutput = Omit<ReportOutput, 'content'>;
interface PerformJobOpts {
    task: ReportTaskParams;
    taskInstanceFields: TaskInstanceFields;
    fakeRequest?: KibanaRequest;
    cancellationToken: CancellationToken;
    stream: Writable;
}
interface GetHeadersOpts {
    encryptedHeaders?: string;
    requestFromTask?: KibanaRequest;
    spaceId: string | undefined;
}
export interface ConstructorOpts {
    config: ReportingConfigType;
    logger: Logger;
    reporting: ReportingCore;
}
export interface PrepareJobResults {
    jobId: string;
    report?: SavedReport;
    task?: ReportTaskParams;
    scheduledReport?: SavedObject<ScheduledReportType>;
}
type ReportTaskParamsType = Record<string, any>;
export interface MaxAttempts {
    maxTaskAttempts: number;
    maxRetries: number;
}
export declare abstract class RunReportTask<TaskParams extends ReportTaskParamsType> implements ReportingTask {
    protected readonly opts: ConstructorOpts;
    protected readonly logger: Logger;
    protected readonly queueTimeout: number;
    protected taskManagerStart?: TaskManagerStartContract;
    protected kibanaId?: string;
    protected kibanaName?: string;
    protected exportTypesRegistry: ExportTypesRegistry;
    protected eventTracker?: EventTracker;
    protected emailNotificationService?: EmailNotificationService;
    constructor(opts: ConstructorOpts);
    abstract exportType: string;
    abstract get TYPE(): string;
    abstract getTaskDefinition(): TaskRegisterDefinition;
    abstract scheduleTask(request: KibanaRequest, params: TaskParams): Promise<ConcreteTaskInstance>;
    protected abstract prepareJob(taskInstance: ConcreteTaskInstance): Promise<PrepareJobResults>;
    protected abstract getMaxAttempts(): MaxAttempts;
    protected abstract notify(report: SavedReport, taskInstance: ConcreteTaskInstance, output: TaskRunResult, byteSize: number, scheduledReport?: SavedObject<ScheduledReportType>, spaceId?: string): Promise<void>;
    init(taskManager: TaskManagerStartContract, emailNotificationService?: EmailNotificationService): Promise<void>;
    getStatus(): ReportingTaskStatus;
    protected getTaskManagerStart(): TaskManagerStartContract;
    protected getEventTracker(report: Report): EventTracker | undefined;
    protected getJobContentEncoding(jobType: string): "base64" | "csv" | undefined;
    protected getJobContentExtension(jobType: string): "csv" | "png" | "pdf";
    protected getMaxConcurrency(): 1 | 0;
    protected getQueueTimeout(): moment.Duration;
    protected getQueueTimeoutAsInterval(): string;
    private saveExecutionError;
    protected saveExecutionWarning(report: SavedReport, output: CompletedReportOutput, message: string): Promise<UpdateResponse<ReportDocument>>;
    protected formatOutput(output: CompletedReportOutput | ReportingError): ReportOutput;
    protected getRequestToUse({ requestFromTask, spaceId, encryptedHeaders, }: GetHeadersOpts): Promise<KibanaRequest>;
    protected getFakeRequest(headers: Headers, spaceId: string | undefined, logger?: Logger): KibanaRequest;
    protected performJob({ task, fakeRequest, taskInstanceFields, cancellationToken, stream, }: PerformJobOpts): Promise<TaskRunResult>;
    protected completeJob(report: SavedReport, attempts: number, output: CompletedReportOutput): Promise<SavedReport>;
    protected throwIfKibanaShutsDown<T>(): Promise<T>;
    protected getTaskRunner(): TaskRunCreatorFunction;
}
export {};
