/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { CancellationToken, numberToDuration } from '@kbn/reporting-common';
import type { ExecutionError, ReportDocument } from '@kbn/reporting-common/types';
import { type ReportingConfigType } from '@kbn/reporting-server';
import type {
  RunContext,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';
import { throwRetryableError } from '@kbn/task-manager-plugin/server';

import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import {
  REPORTING_EXECUTE_TYPE,
  ReportingTask,
  ReportingTaskStatus,
  SCHEDULED_REPORTING_EXECUTE_TYPE,
  ScheduledReportTaskParams,
  TIME_BETWEEN_ATTEMPTS,
} from '.';
import { getContentStream, finishedWithNoPendingCallbacks } from '../content_stream';
import type { ReportingCore } from '../..';
import { mapToReportingError } from '../../../common/errors/map_to_reporting_error';
import type { ReportingStore } from '../store';
import { SavedReport } from '../store';
import type { ReportFailedFields } from '../store/store';
import { errorLogger } from './error_logger';

// type CompletedReportOutput = Omit<ReportOutput, 'content'>;

// interface PerformJobOpts {
//   task: ReportTaskParams;
//   taskInstanceFields: TaskInstanceFields;
//   fakeRequest?: KibanaRequest;
//   cancellationToken: CancellationToken;
//   stream: Writable;
// }

// interface GetHeadersOpts {
//   encryptedHeaders?: string;
//   requestFromTask?: KibanaRequest;
//   spaceId: string | undefined;
// }
interface TaskInstance {
  id: string;
  state: object;
  taskType: string;
  params: ScheduledReportTaskParams;
  runAt?: Date;
}

// function isOutput(output: CompletedReportOutput | Error): output is CompletedReportOutput {
//   return (output as CompletedReportOutput).size != null;
// }

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

export class RunScheduledReportTask implements ReportingTask {
  public TYPE = SCHEDULED_REPORTING_EXECUTE_TYPE;

  private logger: Logger;
  private taskManagerStart?: TaskManagerStartContract;
  // private kibanaId?: string;
  // private kibanaName?: string;
  private exportTypesRegistry: ExportTypesRegistry;
  private store?: ReportingStore;
  // private eventTracker?: EventTracker;

  constructor(
    private reporting: ReportingCore,
    private config: ReportingConfigType,
    logger: Logger
  ) {
    this.logger = logger.get('runTask');
    this.exportTypesRegistry = this.reporting.getExportTypesRegistry();
  }

  /*
   * To be called from plugin start
   */
  public async init(taskManager: TaskManagerStartContract) {
    this.taskManagerStart = taskManager;

    // const { reporting } = this;
    // const { uuid, name } = reporting.getServerInfo();
    // this.kibanaId = uuid;
    // this.kibanaName = name;
  }

  /*
   * Async get the ReportingStore: it is only available after PluginStart
   */
  private async getStore(): Promise<ReportingStore> {
    if (this.store) {
      return this.store;
    }
    const { store } = await this.reporting.getPluginStartDeps();
    this.store = store;
    return store;
  }

  private getTaskManagerStart() {
    if (!this.taskManagerStart) {
      throw new Error('Reporting task runner has not been initialized!');
    }
    return this.taskManagerStart;
  }

  // private getEventTracker(report: Report) {
  //   if (this.eventTracker) {
  //     return this.eventTracker;
  //   }

  //   const eventTracker = this.reporting.getEventTracker(
  //     report._id,
  //     report.jobtype,
  //     report.payload.objectType
  //   );
  //   this.eventTracker = eventTracker;
  //   return this.eventTracker;
  // }

  private getJobContentEncoding(jobType: string) {
    const exportType = this.exportTypesRegistry.getByJobType(jobType);
    return exportType.jobContentEncoding;
  }

  // private async _claimJob(task: ReportTaskParams): Promise<SavedReport> {
  //   if (this.kibanaId == null) {
  //     throw new Error(`Kibana instance ID is undefined!`);
  //   }
  //   if (this.kibanaName == null) {
  //     throw new Error(`Kibana instance name is undefined!`);
  //   }

  //   const store = await this.getStore();
  //   const report = await store.findReportFromTask(task); // receives seq_no and primary_term
  //   const logger = this.logger.get(report._id);

  //   if (report.status === 'completed') {
  //     throw new Error(`Can not claim the report job: it is already completed!`);
  //   }

  //   const m = moment();

  //   let err: ReportingError;
  //   if (report.error && isExecutionError(report.error)) {
  //     // We have an error stored from a previous attempts, so we'll use that
  //     // error to fail the job and return it to the user.
  //     const { error } = report;
  //     err = mapToReportingError(error);
  //     err.stack = error.stack;

  //     await this._failJob(report, err);
  //     throw err;
  //   }

  //   const queueTimeout = durationToNumber(this.config.queue.timeout);
  //   const startTime = m.toISOString();
  //   const expirationTime = m.add(queueTimeout).toISOString();

  //   const doc: ReportProcessingFields = {
  //     kibana_id: this.kibanaId,
  //     kibana_name: this.kibanaName,
  //     attempts: report.attempts + 1,
  //     max_attempts: 1, // maxAttempts,
  //     started_at: startTime,
  //     timeout: queueTimeout,
  //     process_expiration: expirationTime,
  //   };

  //   const claimedReport = new SavedReport({
  //     ...report,
  //     ...doc,
  //   });

  //   logger.info(
  //     `Claiming ${claimedReport.jobtype} ${report._id} ` +
  //       `[_index: ${report._index}] ` +
  //       `[_seq_no: ${report._seq_no}] ` +
  //       `[_primary_term: ${report._primary_term}] ` +
  //       `[attempts: ${report.attempts}] ` +
  //       `[process_expiration: ${expirationTime}]`
  //   );

  //   // event tracking of claimed job
  //   const eventTracker = this.getEventTracker(report);
  //   const timeSinceCreation = Date.now() - new Date(report.created_at).valueOf();
  //   eventTracker?.claimJob({ timeSinceCreation });

  //   const resp = await store.setReportClaimed(claimedReport, doc);
  //   claimedReport._seq_no = resp._seq_no!;
  //   claimedReport._primary_term = resp._primary_term!;
  //   return claimedReport;
  // }

  // private async _failJob(
  //   report: SavedReport,
  //   error?: ReportingError
  // ): Promise<UpdateResponse<ReportDocument>> {
  //   const message = `Failing ${report.jobtype} job ${report._id}`;
  //   const logger = this.logger.get(report._id);

  //   // log the error
  //   let docOutput;
  //   if (error) {
  //     errorLogger(logger, message, error);
  //     docOutput = this._formatOutput(error);
  //   } else {
  //     errorLogger(logger, message);
  //   }

  //   // update the report in the store
  //   const store = await this.getStore();
  //   const completedTime = moment();
  //   const doc: ReportFailedFields = {
  //     completed_at: completedTime.toISOString(),
  //     output: docOutput ?? null,
  //   };

  //   // event tracking of failed job
  //   const eventTracker = this.getEventTracker(report);
  //   const timeSinceCreation = Date.now() - new Date(report.created_at).valueOf();
  //   eventTracker?.failJob({
  //     timeSinceCreation,
  //     errorCode: docOutput?.error_code ?? 'unknown',
  //     errorMessage: error?.message ?? 'unknown',
  //   });

  //   return await store.setReportFailed(report, doc);
  // }

  private async _saveExecutionError(
    report: SavedReport,
    failedToExecuteErr: any
  ): Promise<UpdateResponse<ReportDocument>> {
    const message = `Saving execution error for ${report.jobtype} job ${report._id}`;
    const errorParsed = parseError(failedToExecuteErr);
    const logger = this.logger.get(report._id);
    // log the error
    errorLogger(logger, message, failedToExecuteErr);

    // update the report in the store
    const store = await this.getStore();
    const doc: ReportFailedFields = {
      output: null,
      error: errorParsed,
    };

    return await store.setReportError(report, doc);
  }

  // private _formatOutput(output: CompletedReportOutput | ReportingError): ReportOutput {
  //   const docOutput = {} as ReportOutput;
  //   const unknownMime = null;

  //   if (isOutput(output)) {
  //     docOutput.content_type = output.content_type || unknownMime;
  //     docOutput.max_size_reached = output.max_size_reached;
  //     docOutput.csv_contains_formulas = output.csv_contains_formulas;
  //     docOutput.size = output.size;
  //     docOutput.warnings =
  //       output.warnings && output.warnings.length > 0 ? output.warnings : undefined;
  //     docOutput.error_code = output.error_code;
  //   } else {
  //     const defaultOutput = null;
  //     docOutput.content = output.humanFriendlyMessage?.() || output.toString() || defaultOutput;
  //     docOutput.content_type = unknownMime;
  //     docOutput.warnings = [output.toString()];
  //     docOutput.error_code = output.code;
  //     docOutput.size = typeof docOutput.content === 'string' ? docOutput.content.length : 0;
  //   }

  //   return docOutput;
  // }

  // private async _getRequestToUse({
  //   requestFromTask,
  //   spaceId,
  //   encryptedHeaders,
  // }: GetHeadersOpts): Promise<KibanaRequest> {
  //   let useApiKeyAuthentication: boolean = false;

  //   let apiKeyAuthHeaders;
  //   if (requestFromTask) {
  //     apiKeyAuthHeaders = requestFromTask.headers;
  //     useApiKeyAuthentication = true;
  //     this.logger.debug(`Using API key authentication with request from task instance`);
  //   }

  //   let decryptedHeaders;
  //   if (this.config.encryptionKey && encryptedHeaders) {
  //     // get decrypted headers
  //     decryptedHeaders = await decryptJobHeaders(
  //       this.config.encryptionKey,
  //       encryptedHeaders,
  //       this.logger
  //     );
  //   }

  //   if (!decryptedHeaders && !apiKeyAuthHeaders) {
  //     throw new Error('No headers found to execute report');
  //   }

  //   let headersToUse: Headers = {};

  //   if (useApiKeyAuthentication && apiKeyAuthHeaders) {
  //     this.logger.debug(`Merging API key authentication headers with decrypted headers`);
  //     const { cookie, authorization, ...restDecryptedHeaders } = decryptedHeaders || {};

  //     headersToUse = {
  //       ...apiKeyAuthHeaders,
  //       ...restDecryptedHeaders,
  //     };
  //   } else {
  //     this.logger.debug(`Using decrypted headers only`);
  //     headersToUse = decryptedHeaders || {};
  //   }

  //   return this._getFakeRequest(headersToUse, spaceId, this.logger);
  // }

  // private _getFakeRequest(
  //   headers: Headers,
  //   spaceId: string | undefined,
  //   logger = this.logger
  // ): KibanaRequest {
  //   const rawRequest: FakeRawRequest = {
  //     headers,
  //     path: '/',
  //   };
  //   const fakeRequest = kibanaRequestFactory(rawRequest);

  //   const setupDeps = this.reporting.getPluginSetupDeps();
  //   const spacesService = setupDeps.spaces?.spacesService;
  //   if (spacesService) {
  //     if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
  //       logger.info(`Generating request for space: ${spaceId}`);
  //       setupDeps.basePath.set(fakeRequest, `/s/${spaceId}`);
  //     }
  //   }
  //   return fakeRequest;
  // }

  // private async _performJob({
  //   task,
  //   fakeRequest,
  //   taskInstanceFields,
  //   cancellationToken,
  //   stream,
  // }: PerformJobOpts): Promise<TaskRunResult> {
  //   const exportType = this.exportTypesRegistry.getByJobType(task.jobtype);
  //   if (!exportType) {
  //     throw new Error(`No export type from ${task.jobtype} found to execute report`);
  //   }
  //   // run the report
  //   // if workerFn doesn't finish before timeout, call the cancellationToken and throw an error
  //   const queueTimeout = durationToNumber(this.config.queue.timeout);
  //   const request = await this._getRequestToUse({
  //     requestFromTask: fakeRequest,
  //     spaceId: task.payload.spaceId,
  //     encryptedHeaders: task.payload.headers,
  //   });

  //   return Rx.lastValueFrom(
  //     Rx.from(
  //       exportType.runTask({
  //         jobId: task.id,
  //         payload: task.payload,
  //         request,
  //         taskInstanceFields,
  //         cancellationToken,
  //         stream,
  //       })
  //     ).pipe(timeout(queueTimeout)) // throw an error if a value is not emitted before timeout
  //   );
  // }

  // private async _completeJob(
  //   report: SavedReport,
  //   output: CompletedReportOutput
  // ): Promise<SavedReport> {
  //   let docId = `/${report._index}/_doc/${report._id}`;
  //   const logger = this.logger.get(report._id);

  //   logger.debug(`Saving ${report.jobtype} to ${docId}.`);

  //   const completedTime = moment();
  //   const docOutput = this._formatOutput(output);
  //   const store = await this.getStore();
  //   const doc = {
  //     completed_at: completedTime.toISOString(),
  //     metrics: output.metrics,
  //     output: docOutput,
  //   };
  //   docId = `/${report._index}/_doc/${report._id}`;

  //   const resp = await store.setReportCompleted(report, doc);

  //   logger.info(`Saved ${report.jobtype} job ${docId}`);
  //   report._seq_no = resp._seq_no!;
  //   report._primary_term = resp._primary_term!;

  //   // event tracking of completed job
  //   const eventTracker = this.getEventTracker(report);
  //   const byteSize = docOutput.size;
  //   const timeSinceCreation = completedTime.valueOf() - new Date(report.created_at).valueOf();

  //   if (output.metrics?.csv != null) {
  //     eventTracker?.completeJobCsv({
  //       byteSize,
  //       timeSinceCreation,
  //       csvRows: output.metrics.csv.rows ?? -1,
  //     });
  //   } else if (output.metrics?.pdf != null || output.metrics?.png != null) {
  //     const { width, height } = report.payload.layout?.dimensions ?? {};
  //     eventTracker?.completeJobScreenshot({
  //       byteSize,
  //       timeSinceCreation,
  //       screenshotLayout: report.payload.layout?.id ?? 'preserve_layout',
  //       numPages: output.metrics.pdf?.pages ?? -1,
  //       screenshotPixels: Math.round((width ?? 0) * (height ?? 0)),
  //     });
  //   }

  //   return report;
  // }

  // // Generic is used to let TS infer the return type at call site.
  // private async throwIfKibanaShutsDown<T>(): Promise<T> {
  //   await Rx.firstValueFrom(this.reporting.getKibanaShutdown$());
  //   throw new KibanaShuttingDownError();
  // }

  /*
   * Provides a TaskRunner for Task Manager
   */
  private getTaskRunner(): TaskRunCreatorFunction {
    // Keep a separate local stack for each task run
    return ({ taskInstance, fakeRequest }: RunContext) => {
      let jobId: string;
      const cancellationToken = new CancellationToken();
      const {
        params: scheduledReportTaskParams,
        // retryAt: taskRetryAt,
        // startedAt: taskStartedAt,
      } = taskInstance;

      return {
        /*
         * Runs a reporting job
         * Claim job: Finds the scheduled report in saved objects index, updates it to "processing"
         * Perform job: Gets the export type's runner, runs it with the job params
         * Complete job: Updates the report in ReportStore with the output from the runner
         * If any error happens, additional retry attempts may be picked up by a separate instance
         */
        run: async () => {
          let report: SavedReport | undefined;

          // find the job in the store and set status to processing
          const task = scheduledReportTaskParams as ScheduledReportTaskParams;
          jobId = task?.id;

          try {
            if (!jobId) {
              throw new Error('Invalid report data provided in scheduled task!');
            }

            this.reporting.trackReport(jobId);

            // Update job status to claimed
            // report = await this._claimJob(task);
          } catch (failedToClaim) {
            // error claiming report - log the error
            // could be version conflict, or too many attempts or no longer connected to ES
            errorLogger(this.logger, `Error in claiming ${jobId}`, failedToClaim);
          }

          if (!report) {
            this.reporting.untrackReport(jobId);

            const errorMessage = `Job ${jobId} could not be claimed. Exiting...`;
            errorLogger(this.logger, errorMessage);

            // Throw so Task manager can clean up the failed task
            throw new Error(errorMessage);
          }

          const { jobtype: jobType } = report;
          const logger = this.logger.get(jobId);

          logger.debug(`Starting ${jobType} report ${jobId}.`);
          logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);

          // const eventLog = this.reporting.getEventLogger(
          //   new Report({ ...task, _id: task.id, _index: task.index })
          // );

          try {
            const jobContentEncoding = this.getJobContentEncoding(jobType);
            const stream = await getContentStream(
              this.reporting,
              {
                id: report._id,
                index: report._index,
                if_primary_term: report._primary_term,
                if_seq_no: report._seq_no,
              },
              {
                encoding: jobContentEncoding === 'base64' ? 'base64' : 'raw',
              }
            );
            // eventLog.logExecutionStart();

            // const output = await Promise.race<TaskRunResult>([
            //   this._performJob({
            //     task,
            //     fakeRequest,
            //     taskInstanceFields: { retryAt: taskRetryAt, startedAt: taskStartedAt },
            //     cancellationToken,
            //     stream,
            //   }),
            //   this.throwIfKibanaShutsDown(),
            // ]);

            stream.end();

            logger.debug(`Begin waiting for the stream's pending callbacks...`);
            await finishedWithNoPendingCallbacks(stream);
            logger.info(`The stream's pending callbacks have completed.`);

            report._seq_no = stream.getSeqNo()!;
            report._primary_term = stream.getPrimaryTerm()!;

            // eventLog.logExecutionComplete({
            //   ...(output.metrics ?? {}),
            //   byteSize: stream.bytesWritten,
            // });

            // if (output) {
            //   logger.debug(`Job output size: ${stream.bytesWritten} bytes.`);
            //   // Update the job status to "completed"
            //   report = await this._completeJob(report, {
            //     ...output,
            //     size: stream.bytesWritten,
            //   });
            // }

            // untrack the report for concurrency awareness
            logger.debug(`Stopping ${jobId}.`);
          } catch (failedToExecuteErr) {
            // eventLog.logError(failedToExecuteErr);

            await this._saveExecutionError(report, failedToExecuteErr).catch(
              (failedToSaveError) => {
                errorLogger(logger, `Error in saving execution error ${jobId}`, failedToSaveError);
              }
            );

            cancellationToken.cancel();

            const error = mapToReportingError(failedToExecuteErr);

            throwRetryableError(error, new Date(Date.now() + TIME_BETWEEN_ATTEMPTS));
          } finally {
            this.reporting.untrackReport(jobId);
            logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);
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

  public getTaskDefinition() {
    // round up from ms to the nearest second
    const queueTimeout = Math.ceil(numberToDuration(this.config.queue.timeout).asSeconds()) + 's';
    const maxConcurrency = this.config.queue.pollEnabled ? 1 : 0;

    return {
      type: SCHEDULED_REPORTING_EXECUTE_TYPE,
      title: 'Reporting: execute scheduled job',
      createTaskRunner: this.getTaskRunner(),
      timeout: queueTimeout,
      maxConcurrency,
    };
  }

  public async scheduleTask(request: KibanaRequest, params: ScheduledReportTaskParams) {
    const taskInstance: TaskInstance = {
      id: params.id,
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params,
    };
    return await this.getTaskManagerStart().schedule(taskInstance, { request });
  }

  public getStatus() {
    if (this.taskManagerStart) {
      return ReportingTaskStatus.INITIALIZED;
    }

    return ReportingTaskStatus.UNINITIALIZED;
  }
}
