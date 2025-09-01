/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import * as Rx from 'rxjs';
import { timeout } from 'rxjs';
import type { Writable } from 'stream';
import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import type { UpdateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, Logger, SavedObject } from '@kbn/core/server';
import type { ReportingError } from '@kbn/reporting-common';
import {
  CancellationToken,
  KibanaShuttingDownError,
  MissingAuthenticationError,
  numberToDuration,
} from '@kbn/reporting-common';
import type {
  ExecutionError,
  ReportDocument,
  ReportOutput,
  TaskInstanceFields,
  TaskRunResult,
} from '@kbn/reporting-common/types';
import { decryptJobHeaders, type ReportingConfigType } from '@kbn/reporting-server';
import {
  throwRetryableError,
  type ConcreteTaskInstance,
  type RunContext,
  type TaskManagerStartContract,
  type TaskRegisterDefinition,
  type TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';

import type { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { mapToReportingError } from '../../../common/errors/map_to_reporting_error';
import type { ReportTaskParams, ReportingTask } from '.';
import { ReportingTaskStatus, TIME_BETWEEN_ATTEMPTS } from '.';
import type { ReportingCore } from '../..';
import type { EventTracker } from '../../usage';
import type { SavedReport } from '../store';
import { Report } from '../store';
import type { ReportFailedFields, ReportWarningFields } from '../store/store';
import { errorLogger } from './error_logger';
import { finishedWithNoPendingCallbacks, getContentStream } from '../content_stream';
import type { EmailNotificationService } from '../../services/notifications/email_notification_service';
import type { ScheduledReportType } from '../../types';
import { retryOnError } from '../retry_on_error';

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

function isOutput(output: CompletedReportOutput | Error): output is CompletedReportOutput {
  return (output as CompletedReportOutput).size != null;
}

function parseError(error: unknown): ExecutionError | unknown {
  if (error instanceof Error) {
    return {
      name: error.constructor.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }
  return error;
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
  maxTaskAttempts: number; // number of times the task will be retried
  maxRetries: number; // number of times the report generation logic within a single task run will be retried
}
export abstract class RunReportTask<TaskParams extends ReportTaskParamsType>
  implements ReportingTask
{
  protected readonly logger: Logger;
  protected readonly queueTimeout: number;

  protected taskManagerStart?: TaskManagerStartContract;
  protected kibanaId?: string;
  protected kibanaName?: string;
  protected exportTypesRegistry: ExportTypesRegistry;
  protected eventTracker?: EventTracker;
  protected emailNotificationService?: EmailNotificationService;

  constructor(protected readonly opts: ConstructorOpts) {
    this.logger = opts.logger.get('runTask');
    this.exportTypesRegistry = opts.reporting.getExportTypesRegistry();
    this.queueTimeout = this.getQueueTimeout().asMilliseconds();
  }

  // Abstract methods
  public abstract get TYPE(): string;

  public abstract getTaskDefinition(): TaskRegisterDefinition;

  public abstract scheduleTask(
    request: KibanaRequest,
    params: TaskParams
  ): Promise<ConcreteTaskInstance>;

  protected abstract prepareJob(taskInstance: ConcreteTaskInstance): Promise<PrepareJobResults>;

  protected abstract getMaxAttempts(): MaxAttempts;

  protected abstract notify(
    report: SavedReport,
    taskInstance: ConcreteTaskInstance,
    output: TaskRunResult,
    byteSize: number,
    scheduledReport?: SavedObject<ScheduledReportType>,
    spaceId?: string
  ): Promise<void>;

  // Public methods
  public async init(
    taskManager: TaskManagerStartContract,
    emailNotificationService?: EmailNotificationService
  ) {
    this.taskManagerStart = taskManager;

    const { uuid, name } = this.opts.reporting.getServerInfo();
    this.kibanaId = uuid;
    this.kibanaName = name;

    this.emailNotificationService = emailNotificationService;
  }

  public getStatus() {
    if (this.taskManagerStart) {
      return ReportingTaskStatus.INITIALIZED;
    }

    return ReportingTaskStatus.UNINITIALIZED;
  }

  // Protected methods
  protected getTaskManagerStart() {
    if (!this.taskManagerStart) {
      throw new Error('Reporting task runner has not been initialized!');
    }
    return this.taskManagerStart;
  }

  protected getEventTracker(report: Report) {
    if (this.eventTracker) {
      return this.eventTracker;
    }

    const eventTracker = this.opts.reporting.getEventTracker(
      report._id,
      report.jobtype,
      report.payload.objectType
    );
    this.eventTracker = eventTracker;
    return this.eventTracker;
  }

  protected getJobContentEncoding(jobType: string) {
    const exportType = this.exportTypesRegistry.getByJobType(jobType);
    return exportType.jobContentEncoding;
  }

  protected getJobContentExtension(jobType: string) {
    const exportType = this.exportTypesRegistry.getByJobType(jobType);
    return exportType.jobContentExtension;
  }

  protected getMaxConcurrency() {
    return this.opts.config.queue.pollEnabled ? 1 : 0;
  }

  protected getQueueTimeout() {
    const maxAttempts = this.getMaxAttempts();
    const configuredTimeoutDuration: moment.Duration = numberToDuration(
      this.opts.config.queue.timeout
    );
    // round up from ms to the nearest second
    return moment.duration({
      milliseconds: configuredTimeoutDuration.asMilliseconds() * (maxAttempts.maxRetries + 1),
    });
  }

  protected getQueueTimeoutAsInterval() {
    // round up from ms to the nearest second
    return Math.ceil(this.getQueueTimeout().asSeconds()) + 's';
  }

  private async saveExecutionError(
    report: SavedReport,
    failedToExecuteErr: Error,
    isLastAttempt: boolean
  ): Promise<UpdateResponse<ReportDocument>> {
    const message = `Saving execution error for ${report.jobtype} job ${report._id}`;
    const errorParsed = parseError(failedToExecuteErr);
    const logger = this.logger.get(report._id);
    // log the error
    errorLogger(logger, message, failedToExecuteErr);

    // update the report in the store
    const store = await this.opts.reporting.getStore();
    const doc: ReportFailedFields = {
      output: null,
      error: errorParsed,
    };

    if (isLastAttempt) {
      const error = mapToReportingError(failedToExecuteErr);
      const docOutput = this.formatOutput(error);
      const completedTime = moment();
      doc.completed_at = completedTime.toISOString();
      doc.output = docOutput ?? null;

      // event tracking of failed job
      const eventTracker = this.getEventTracker(report);
      const timeSinceCreation = Date.now() - new Date(report.created_at).valueOf();
      eventTracker?.failJob({
        timeSinceCreation,
        errorCode: docOutput?.error_code ?? 'unknown',
        errorMessage: error?.message ?? 'unknown',
      });

      return await store.setReportFailed(report, doc);
    }

    return await store.setReportError(report, doc);
  }

  protected async saveExecutionWarning(
    report: SavedReport,
    output: CompletedReportOutput,
    message: string
  ): Promise<UpdateResponse<ReportDocument>> {
    const logger = this.logger.get(report._id);
    logger.warn(message);

    // update the report in the store
    const store = await this.opts.reporting.getStore();
    const doc: ReportWarningFields = {
      output,
      warning: message,
    };

    return await store.setReportWarning(report, doc);
  }

  protected formatOutput(output: CompletedReportOutput | ReportingError): ReportOutput {
    const docOutput = {} as ReportOutput;
    const unknownMime = null;

    if (isOutput(output)) {
      docOutput.content_type = output.content_type || unknownMime;
      docOutput.max_size_reached = output.max_size_reached;
      docOutput.csv_contains_formulas = output.csv_contains_formulas;
      docOutput.size = output.size;
      docOutput.warnings =
        output.warnings && output.warnings.length > 0 ? output.warnings : undefined;
      docOutput.error_code = output.error_code;
    } else {
      const defaultOutput = null;
      docOutput.content = output.humanFriendlyMessage?.() || output.toString() || defaultOutput;
      docOutput.content_type = unknownMime;
      docOutput.warnings = [output.toString()];
      docOutput.error_code = output.code;
      docOutput.size = typeof docOutput.content === 'string' ? docOutput.content.length : 0;
    }

    return docOutput;
  }

  protected async getRequestToUse({
    requestFromTask,
    spaceId,
    encryptedHeaders,
  }: GetHeadersOpts): Promise<KibanaRequest> {
    let useApiKeyAuthentication: boolean = false;

    let apiKeyAuthHeaders;
    if (requestFromTask) {
      apiKeyAuthHeaders = requestFromTask.headers;
      useApiKeyAuthentication = true;
      this.logger.debug(`Using API key authentication with request from task instance`);
    }

    let decryptedHeaders;
    if (this.opts.config.encryptionKey && encryptedHeaders) {
      // get decrypted headers
      decryptedHeaders = await decryptJobHeaders(
        this.opts.config.encryptionKey,
        encryptedHeaders,
        this.logger
      );
    }

    if (!decryptedHeaders && !apiKeyAuthHeaders) {
      throw new MissingAuthenticationError();
    }

    let headersToUse: Headers = {};

    if (useApiKeyAuthentication && apiKeyAuthHeaders) {
      this.logger.debug(`Merging API key authentication headers with decrypted headers`);
      const { cookie, authorization, ...restDecryptedHeaders } = decryptedHeaders || {};

      headersToUse = {
        ...apiKeyAuthHeaders,
        ...restDecryptedHeaders,
      };
    } else {
      this.logger.debug(`Using decrypted headers only`);
      headersToUse = decryptedHeaders || {};
    }

    return this.getFakeRequest(headersToUse, spaceId, this.logger);
  }

  protected getFakeRequest(
    headers: Headers,
    spaceId: string | undefined,
    logger = this.logger
  ): KibanaRequest {
    const rawRequest: FakeRawRequest = {
      headers,
      path: '/',
    };
    const fakeRequest = kibanaRequestFactory(rawRequest);

    const setupDeps = this.opts.reporting.getPluginSetupDeps();
    const spacesService = setupDeps.spaces?.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        setupDeps.basePath.set(fakeRequest, `/s/${spaceId}`);
      }
    }
    return fakeRequest;
  }

  protected async performJob({
    task,
    fakeRequest,
    taskInstanceFields,
    cancellationToken,
    stream,
  }: PerformJobOpts): Promise<TaskRunResult> {
    const exportType = this.exportTypesRegistry.getByJobType(task.jobtype);
    if (!exportType) {
      throw new Error(`No export type from ${task.jobtype} found to execute report`);
    }
    // run the report
    // if workerFn doesn't finish before timeout, call the cancellationToken and throw an error
    const request = await this.getRequestToUse({
      requestFromTask: fakeRequest,
      spaceId: task.payload.spaceId,
      encryptedHeaders: task.payload.headers,
    });

    return Rx.lastValueFrom(
      Rx.from(
        exportType.runTask({
          jobId: task.id,
          payload: task.payload,
          request,
          taskInstanceFields,
          cancellationToken,
          stream,
        })
      ).pipe(timeout(this.queueTimeout)) // throw an error if a value is not emitted before timeout
    );
  }

  protected async completeJob(
    report: SavedReport,
    output: CompletedReportOutput
  ): Promise<SavedReport> {
    let docId = `/${report._index}/_doc/${report._id}`;
    const logger = this.logger.get(report._id);

    logger.debug(`Saving ${report.jobtype} to ${docId}.`);

    const completedTime = moment();
    const docOutput = this.formatOutput(output);
    const store = await this.opts.reporting.getStore();
    const doc = {
      completed_at: completedTime.toISOString(),
      metrics: output.metrics,
      output: docOutput,
    };
    docId = `/${report._index}/_doc/${report._id}`;

    const resp = await store.setReportCompleted(report, doc);

    logger.info(`Saved ${report.jobtype} job ${docId}`);
    report._seq_no = resp._seq_no!;
    report._primary_term = resp._primary_term!;

    // event tracking of completed job
    const eventTracker = this.getEventTracker(report);
    const byteSize = docOutput.size;
    const timeSinceCreation = completedTime.valueOf() - new Date(report.created_at).valueOf();

    if (output.metrics?.csv != null) {
      eventTracker?.completeJobCsv({
        byteSize,
        timeSinceCreation,
        csvRows: output.metrics.csv.rows ?? -1,
      });
    } else if (output.metrics?.pdf != null || output.metrics?.png != null) {
      const { width, height } = report.payload.layout?.dimensions ?? {};
      eventTracker?.completeJobScreenshot({
        byteSize,
        timeSinceCreation,
        screenshotLayout: report.payload.layout?.id ?? 'preserve_layout',
        numPages: output.metrics.pdf?.pages ?? -1,
        screenshotPixels: Math.round((width ?? 0) * (height ?? 0)),
      });
    }

    return report;
  }

  // Generic is used to let TS infer the return type at call site.
  protected async throwIfKibanaShutsDown<T>(): Promise<T> {
    await Rx.firstValueFrom(this.opts.reporting.getKibanaShutdown$());
    throw new KibanaShuttingDownError();
  }

  /*
   * Provides a TaskRunner for Task Manager
   */
  protected getTaskRunner(): TaskRunCreatorFunction {
    // Keep a separate local stack for each task run
    return ({ taskInstance, fakeRequest }: RunContext) => {
      let jobId: string;
      const cancellationToken = new CancellationToken();
      const { retryAt: taskRetryAt, startedAt: taskStartedAt } = taskInstance;

      return {
        /*
         * Runs a reporting job
         * Claim job: Finds the report in ReportingStore, updates it to "processing"
         * Perform job: Gets the export type's runner, runs it with the job params
         * Complete job: Updates the report in ReportStore with the output from the runner
         * If any error happens, additional retry attempts may be picked up by a separate instance
         */
        run: async () => {
          if (this.kibanaId == null) {
            throw new Error(`Kibana instance ID is undefined!`);
          }
          if (this.kibanaName == null) {
            throw new Error(`Kibana instance name is undefined!`);
          }
          const { attempts: taskAttempts } = taskInstance;

          let report: SavedReport | undefined;
          const {
            jobId: jId,
            report: preparedReport,
            task,
            scheduledReport,
          } = await this.prepareJob(taskInstance);
          jobId = jId;
          report = preparedReport;

          if (!report || !task) {
            this.opts.reporting.untrackReport(jobId);

            const errorMessage = `Job ${jobId} could not be claimed. Exiting...`;
            errorLogger(this.logger, errorMessage);

            // Throw so Task manager can clean up the failed task
            throw new Error(errorMessage);
          }

          const { jobtype: jobType, attempts } = report;
          const logger = this.logger.get(jobId);

          const maxAttempts = this.getMaxAttempts();
          if (maxAttempts) {
            logger.debug(
              `Starting ${jobType} report ${jobId}: attempt ${attempts} of ${maxAttempts.maxTaskAttempts}.`
            );
          } else {
            logger.debug(`Starting ${jobType} report ${jobId}.`);
          }

          logger.debug(`Reports running: ${this.opts.reporting.countConcurrentReports()}.`);

          const eventLog = this.opts.reporting.getEventLogger(
            new Report({ ...task, _id: task.id, _index: task.index })
          );

          try {
            await retryOnError({
              logger: this.logger,
              retries: maxAttempts.maxRetries,
              report,
              operation: async (rep: SavedReport) => {
                const jobContentEncoding = this.getJobContentEncoding(jobType);
                const stream = await getContentStream(
                  this.opts.reporting,
                  {
                    id: rep._id,
                    index: rep._index,
                    if_primary_term: rep._primary_term,
                    if_seq_no: rep._seq_no,
                  },
                  {
                    encoding: jobContentEncoding === 'base64' ? 'base64' : 'raw',
                  }
                );
                eventLog.logExecutionStart();

                const output = await Promise.race<TaskRunResult>([
                  this.performJob({
                    task,
                    fakeRequest,
                    taskInstanceFields: { retryAt: taskRetryAt, startedAt: taskStartedAt },
                    cancellationToken,
                    stream,
                  }),
                  this.throwIfKibanaShutsDown(),
                ]);

                stream.end();

                logger.debug(`Begin waiting for the stream's pending callbacks...`);
                await finishedWithNoPendingCallbacks(stream);
                logger.info(`The stream's pending callbacks have completed.`);

                rep._seq_no = stream.getSeqNo()!;
                rep._primary_term = stream.getPrimaryTerm()!;

                const byteSize = stream.bytesWritten;
                eventLog.logExecutionComplete({ ...(output.metrics ?? {}), byteSize });

                if (output) {
                  logger.debug(`Job output size: ${byteSize} bytes.`);
                  // Update the job status to "completed"
                  report = await this.completeJob(rep, { ...output, size: byteSize });

                  await this.notify(
                    report,
                    taskInstance,
                    output,
                    byteSize,
                    scheduledReport,
                    task.payload.spaceId
                  );
                }

                // untrack the report for concurrency awareness
                logger.debug(`Stopping ${jobId}.`);
              },
            });
          } catch (failedToExecuteErr) {
            const isLastAttempt = taskAttempts ? taskAttempts >= maxAttempts.maxTaskAttempts : true;
            eventLog.logError(failedToExecuteErr);

            await this.saveExecutionError(report, failedToExecuteErr, isLastAttempt).catch(
              (failedToSaveError) => {
                errorLogger(logger, `Error in saving execution error ${jobId}`, failedToSaveError);
              }
            );

            cancellationToken.cancel();

            if (isLastAttempt) {
              this.logger.info(
                `Job ${jobId} failed on its last attempt and will not be retried. Error: ${failedToExecuteErr.message}.`
              );
            } else {
              this.logger.info(
                `Job ${jobId} failed, but will be retried. Error: ${failedToExecuteErr.message}.`
              );
            }

            throwRetryableError(failedToExecuteErr, new Date(Date.now() + TIME_BETWEEN_ATTEMPTS));
          } finally {
            this.opts.reporting.untrackReport(jobId);
            logger.debug(`Reports running: ${this.opts.reporting.countConcurrentReports()}.`);
          }
        },

        /*
         * Called by Task Manager to stop the report execution process in case
         * of timeout or server shutdown
         */
        cancel: async () => {
          if (jobId) {
            this.logger.get(jobId).warn(`Cancelling job ${jobId}...`);
          }
          cancellationToken.cancel();
        },
      };
    };
  }
}
