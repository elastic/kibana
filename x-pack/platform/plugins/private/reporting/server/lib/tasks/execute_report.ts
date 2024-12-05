/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import * as Rx from 'rxjs';
import { timeout } from 'rxjs';
import { Writable } from 'stream';
import { finished } from 'stream/promises';
import { setTimeout } from 'timers/promises';

import { UpdateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger } from '@kbn/core/server';
import {
  CancellationToken,
  KibanaShuttingDownError,
  QueueTimeoutError,
  ReportingError,
  durationToNumber,
  numberToDuration,
} from '@kbn/reporting-common';
import type {
  ExecutionError,
  ReportDocument,
  ReportOutput,
  TaskInstanceFields,
  TaskRunResult,
} from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '@kbn/reporting-server';
import type {
  RunContext,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';
import { throwRetryableError } from '@kbn/task-manager-plugin/server';

import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import {
  REPORTING_EXECUTE_TYPE,
  ReportTaskParams,
  ReportingTask,
  ReportingTaskStatus,
  TIME_BETWEEN_ATTEMPTS,
} from '.';
import { getContentStream } from '..';
import type { ReportingCore } from '../..';
import {
  isExecutionError,
  mapToReportingError,
} from '../../../common/errors/map_to_reporting_error';
import { EventTracker } from '../../usage';
import type { ReportingStore } from '../store';
import { Report, SavedReport } from '../store';
import type { ReportFailedFields, ReportProcessingFields } from '../store/store';
import { errorLogger } from './error_logger';

type CompletedReportOutput = Omit<ReportOutput, 'content'>;

interface ReportingExecuteTaskInstance {
  state: object;
  taskType: string;
  params: ReportTaskParams;
  runAt?: Date;
}

function isOutput(output: CompletedReportOutput | Error): output is CompletedReportOutput {
  return (output as CompletedReportOutput).size != null;
}

async function finishedWithNoPendingCallbacks(stream: Writable) {
  await finished(stream, { readable: false });

  // Race condition workaround:
  // `finished(...)` will resolve while there's still pending callbacks in the writable part of the `stream`.
  // This introduces a race condition where the code continues before the writable part has completely finished.
  // The `pendingCallbacks` function is a hack to ensure that all pending callbacks have been called before continuing.
  // For more information, see: https://github.com/nodejs/node/issues/46170
  await (async function pendingCallbacks(delay = 1) {
    if ((stream as any)._writableState.pendingcb > 0) {
      await setTimeout(delay);
      await pendingCallbacks(delay < 32 ? delay * 2 : delay);
    }
  })();
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

export class ExecuteReportTask implements ReportingTask {
  public TYPE = REPORTING_EXECUTE_TYPE;

  private logger: Logger;
  private taskManagerStart?: TaskManagerStartContract;
  private kibanaId?: string;
  private kibanaName?: string;
  private exportTypesRegistry: ExportTypesRegistry;
  private store?: ReportingStore;
  private eventTracker?: EventTracker;

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

    const { reporting } = this;
    const { uuid, name } = reporting.getServerInfo();
    this.kibanaId = uuid;
    this.kibanaName = name;
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

  private getEventTracker(report: Report) {
    if (this.eventTracker) {
      return this.eventTracker;
    }

    const eventTracker = this.reporting.getEventTracker(
      report._id,
      report.jobtype,
      report.payload.objectType
    );
    this.eventTracker = eventTracker;
    return this.eventTracker;
  }

  private getJobContentEncoding(jobType: string) {
    const exportType = this.exportTypesRegistry.getByJobType(jobType);
    return exportType.jobContentEncoding;
  }

  private async _claimJob(task: ReportTaskParams): Promise<SavedReport> {
    if (this.kibanaId == null) {
      throw new Error(`Kibana instance ID is undefined!`);
    }
    if (this.kibanaName == null) {
      throw new Error(`Kibana instance name is undefined!`);
    }

    const store = await this.getStore();
    const report = await store.findReportFromTask(task); // receives seq_no and primary_term

    if (report.status === 'completed') {
      throw new Error(`Can not claim the report job: it is already completed!`);
    }

    const m = moment();

    // check if job has exceeded the configured maxAttempts
    const maxAttempts = this.getMaxAttempts();
    if (report.attempts >= maxAttempts) {
      let err: ReportingError;
      if (report.error && isExecutionError(report.error)) {
        // We have an error stored from a previous attempts, so we'll use that
        // error to fail the job and return it to the user.
        const { error } = report;
        err = mapToReportingError(error);
        err.stack = error.stack;
      } else {
        if (report.error && report.error instanceof Error) {
          errorLogger(this.logger, 'Error executing report', report.error);
        }
        err = new QueueTimeoutError(
          `Max attempts reached (${maxAttempts}). Queue timeout reached.`
        );
      }
      await this._failJob(report, err);
      throw err;
    }

    const queueTimeout = durationToNumber(this.config.queue.timeout);
    const startTime = m.toISOString();
    const expirationTime = m.add(queueTimeout).toISOString();

    const doc: ReportProcessingFields = {
      kibana_id: this.kibanaId,
      kibana_name: this.kibanaName,
      attempts: report.attempts + 1,
      max_attempts: maxAttempts,
      started_at: startTime,
      timeout: queueTimeout,
      process_expiration: expirationTime,
    };

    const claimedReport = new SavedReport({
      ...report,
      ...doc,
    });

    this.logger.info(
      `Claiming ${claimedReport.jobtype} ${report._id} ` +
        `[_index: ${report._index}] ` +
        `[_seq_no: ${report._seq_no}] ` +
        `[_primary_term: ${report._primary_term}] ` +
        `[attempts: ${report.attempts}] ` +
        `[process_expiration: ${expirationTime}]`
    );

    // event tracking of claimed job
    const eventTracker = this.getEventTracker(report);
    const timeSinceCreation = Date.now() - new Date(report.created_at).valueOf();
    eventTracker?.claimJob({ timeSinceCreation });

    const resp = await store.setReportClaimed(claimedReport, doc);
    claimedReport._seq_no = resp._seq_no!;
    claimedReport._primary_term = resp._primary_term!;
    return claimedReport;
  }

  private async _failJob(
    report: SavedReport,
    error?: ReportingError
  ): Promise<UpdateResponse<ReportDocument>> {
    const message = `Failing ${report.jobtype} job ${report._id}`;

    // log the error
    let docOutput;
    if (error) {
      errorLogger(this.logger, message, error);
      docOutput = this._formatOutput(error);
    } else {
      errorLogger(this.logger, message);
    }

    // update the report in the store
    const store = await this.getStore();
    const completedTime = moment();
    const doc: ReportFailedFields = {
      completed_at: completedTime.toISOString(),
      output: docOutput ?? null,
    };

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

  private async _saveExecutionError(
    report: SavedReport,
    failedToExecuteErr: any
  ): Promise<UpdateResponse<ReportDocument>> {
    const message = `Saving execution error for ${report.jobtype} job ${report._id}`;
    const errorParsed = parseError(failedToExecuteErr);
    // log the error
    errorLogger(this.logger, message, failedToExecuteErr);

    // update the report in the store
    const store = await this.getStore();
    const doc: ReportFailedFields = {
      output: null,
      error: errorParsed,
    };

    return await store.setReportError(report, doc);
  }

  private _formatOutput(output: CompletedReportOutput | ReportingError): ReportOutput {
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

  private async _performJob(
    task: ReportTaskParams,
    taskInstanceFields: TaskInstanceFields,
    cancellationToken: CancellationToken,
    stream: Writable
  ): Promise<TaskRunResult> {
    const exportType = this.exportTypesRegistry.getByJobType(task.jobtype);

    if (!exportType) {
      throw new Error(`No export type from ${task.jobtype} found to execute report`);
    }
    // run the report
    // if workerFn doesn't finish before timeout, call the cancellationToken and throw an error
    const queueTimeout = durationToNumber(this.config.queue.timeout);
    return Rx.lastValueFrom(
      Rx.from(
        exportType.runTask(task.id, task.payload, taskInstanceFields, cancellationToken, stream)
      ).pipe(timeout(queueTimeout)) // throw an error if a value is not emitted before timeout
    );
  }

  private async _completeJob(
    report: SavedReport,
    output: CompletedReportOutput
  ): Promise<SavedReport> {
    let docId = `/${report._index}/_doc/${report._id}`;

    this.logger.debug(`Saving ${report.jobtype} to ${docId}.`);

    const completedTime = moment();
    const docOutput = this._formatOutput(output);
    const store = await this.getStore();
    const doc = {
      completed_at: completedTime.toISOString(),
      metrics: output.metrics,
      output: docOutput,
    };
    docId = `/${report._index}/_doc/${report._id}`;

    const resp = await store.setReportCompleted(report, doc);

    this.logger.info(`Saved ${report.jobtype} job ${docId}`);
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
  private async throwIfKibanaShutsDown<T>(): Promise<T> {
    await Rx.firstValueFrom(this.reporting.getKibanaShutdown$());
    throw new KibanaShuttingDownError();
  }

  /*
   * Provides a TaskRunner for Task Manager
   */
  private getTaskRunner(): TaskRunCreatorFunction {
    // Keep a separate local stack for each task run
    return ({ taskInstance }: RunContext) => {
      let jobId: string;
      const cancellationToken = new CancellationToken();
      const {
        attempts: taskAttempts,
        params: reportTaskParams,
        retryAt: taskRetryAt,
        startedAt: taskStartedAt,
      } = taskInstance;

      return {
        /*
         * Runs a reporting job
         * Claim job: Finds the report in ReportingStore, updates it to "processing"
         * Perform job: Gets the export type's runner, runs it with the job params
         * Complete job: Updates the report in ReportStore with the output from the runner
         * If any error happens, additional retry attempts may be picked up by a separate instance
         */
        run: async () => {
          let report: SavedReport | undefined;
          const isLastAttempt = taskAttempts >= this.getMaxAttempts();

          // find the job in the store and set status to processing
          const task = reportTaskParams as ReportTaskParams;
          jobId = task?.id;

          try {
            if (!jobId) {
              throw new Error('Invalid report data provided in scheduled task!');
            }
            if (!isLastAttempt) {
              this.reporting.trackReport(jobId);
            }

            // Update job status to claimed
            report = await this._claimJob(task);
          } catch (failedToClaim) {
            // error claiming report - log the error
            // could be version conflict, or too many attempts or no longer connected to ES
            errorLogger(this.logger, `Error in claiming ${jobId}`, failedToClaim);
          }

          if (!report) {
            this.reporting.untrackReport(jobId);

            if (isLastAttempt) {
              errorLogger(this.logger, `Job ${jobId} failed too many times. Exiting...`);
              return;
            }

            const errorMessage = `Job ${jobId} could not be claimed. Exiting...`;
            errorLogger(this.logger, errorMessage);

            // Throw so Task manager can clean up the failed task
            throw new Error(errorMessage);
          }

          const { jobtype: jobType, attempts } = report;
          const maxAttempts = this.getMaxAttempts();

          this.logger.debug(
            `Starting ${jobType} report ${jobId}: attempt ${attempts} of ${maxAttempts}.`
          );
          this.logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);

          const eventLog = this.reporting.getEventLogger(
            new Report({ ...task, _id: task.id, _index: task.index })
          );

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
            eventLog.logExecutionStart();

            const output = await Promise.race<TaskRunResult>([
              this._performJob(
                task,
                { retryAt: taskRetryAt, startedAt: taskStartedAt },
                cancellationToken,
                stream
              ),
              this.throwIfKibanaShutsDown(),
            ]);

            stream.end();

            await finishedWithNoPendingCallbacks(stream);

            report._seq_no = stream.getSeqNo()!;
            report._primary_term = stream.getPrimaryTerm()!;

            eventLog.logExecutionComplete({
              ...(output.metrics ?? {}),
              byteSize: stream.bytesWritten,
            });

            if (output) {
              this.logger.debug(`Job output size: ${stream.bytesWritten} bytes.`);
              report = await this._completeJob(report, {
                ...output,
                size: stream.bytesWritten,
              });
            }
            // untrack the report for concurrency awareness
            this.logger.debug(`Stopping ${jobId}.`);
          } catch (failedToExecuteErr) {
            eventLog.logError(failedToExecuteErr);

            await this._saveExecutionError(report, failedToExecuteErr).catch(
              (failedToSaveError) => {
                errorLogger(
                  this.logger,
                  `Error in saving execution error ${jobId}`,
                  failedToSaveError
                );
              }
            );

            cancellationToken.cancel();

            const error = mapToReportingError(failedToExecuteErr);

            throwRetryableError(error, new Date(Date.now() + TIME_BETWEEN_ATTEMPTS));
          } finally {
            this.reporting.untrackReport(jobId);
            this.logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);
          }
        },

        /*
         * Called by Task Manager to stop the report execution process in case
         * of timeout or server shutdown
         */
        cancel: async () => {
          if (jobId) {
            this.logger.warn(`Cancelling job ${jobId}...`);
          }
          cancellationToken.cancel();
        },
      };
    };
  }

  private getMaxAttempts() {
    return this.config.capture.maxAttempts ?? 1;
  }

  public getTaskDefinition() {
    // round up from ms to the nearest second
    const queueTimeout = Math.ceil(numberToDuration(this.config.queue.timeout).asSeconds()) + 's';
    const maxConcurrency = this.config.queue.pollEnabled ? 1 : 0;
    const maxAttempts = this.getMaxAttempts();

    return {
      type: REPORTING_EXECUTE_TYPE,
      title: 'Reporting: execute job',
      createTaskRunner: this.getTaskRunner(),
      maxAttempts: maxAttempts + 1, // Add 1 so we get an extra attempt in case of failure during a Kibana restart
      timeout: queueTimeout,
      maxConcurrency,
    };
  }

  public async scheduleTask(params: ReportTaskParams) {
    const taskInstance: ReportingExecuteTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params,
    };

    return await this.getTaskManagerStart().schedule(taskInstance);
  }

  public getStatus() {
    if (this.taskManagerStart) {
      return ReportingTaskStatus.INITIALIZED;
    }

    return ReportingTaskStatus.UNINITIALIZED;
  }
}
