/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { type FakeRawRequest, type Headers } from '@kbn/core-http-server';
import * as Rx from 'rxjs';
import { timeout } from 'rxjs';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as cron from 'cron';
import { Stream, Writable } from 'stream';
import { finished } from 'stream/promises';
import { setTimeout } from 'timers/promises';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';

import { UpdateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IBasePath, KibanaRequest, Logger } from '@kbn/core/server';
import {
  CancellationToken,
  JOB_STATUS,
  KibanaShuttingDownError,
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
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import { ReportTaskParams, ReportingTaskStatus, TIME_BETWEEN_ATTEMPTS } from '.';
import { ContentStream, getContentStream } from '..';
import type { ReportingCore } from '../..';
import { mapToReportingError } from '../../../common/errors/map_to_reporting_error';
import { EventTracker } from '../../usage';
import type { ReportingStore } from '../store';
import { Report, SavedReport } from '../store';
import { errorLogger } from './error_logger';
import { ReportingExecuteTaskInstance, isOutput } from './execute_report';
import { ReportFailedFields } from '../store/store';

type CompletedReportOutput = Omit<ReportOutput, 'content'>;

const EMAIL = 'maildev-no-auth';

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

export class RunScheduledReportTask {
  public TYPE = 'report:run_scheduled';

  private logger: Logger;
  private taskManagerStart?: TaskManagerStartContract;
  private kibanaId?: string;
  private kibanaName?: string;
  private exportTypesRegistry: ExportTypesRegistry;
  private store?: ReportingStore;
  private eventTracker?: EventTracker;
  private basePathService?: IBasePath;
  private unsecuredActionsClient?: IUnsecuredActionsClient;

  constructor(
    private reporting: ReportingCore,
    private config: ReportingConfigType,
    logger: Logger
  ) {
    this.logger = logger.get('runScheduledReportTask');
    this.exportTypesRegistry = this.reporting.getExportTypesRegistry();
  }

  /*
   * To be called from plugin start
   */
  public async init(
    taskManager: TaskManagerStartContract,
    basePathService: IBasePath,
    actions?: ActionsPluginStartContract
  ) {
    this.taskManagerStart = taskManager;
    this.basePathService = basePathService;

    if (actions) {
      this.unsecuredActionsClient = actions.getUnsecuredActionsClient();
    }

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

  private getMaxAttempts() {
    return this.config.capture.maxAttempts ?? 1;
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

  //   // check if job has exceeded the configured maxAttempts
  //   const maxAttempts = this.getMaxAttempts();
  //   if (report.attempts >= maxAttempts) {
  //     let err: ReportingError;
  //     if (report.error && isExecutionError(report.error)) {
  //       // We have an error stored from a previous attempts, so we'll use that
  //       // error to fail the job and return it to the user.
  //       const { error } = report;
  //       err = mapToReportingError(error);
  //       err.stack = error.stack;
  //     } else {
  //       if (report.error && report.error instanceof Error) {
  //         errorLogger(logger, 'Error executing report', report.error);
  //       }
  //       err = new QueueTimeoutError(
  //         `Max attempts reached (${maxAttempts}). Queue timeout reached.`
  //       );
  //     }
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
  //     max_attempts: maxAttempts,
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
    fakeRequest: KibanaRequest,
    cancellationToken: CancellationToken,
    stream: Writable,
    forceNowOverride: string
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
        exportType.runTask(
          task.id,
          task.payload,
          taskInstanceFields,
          fakeRequest,
          cancellationToken,
          stream,
          forceNowOverride
        )
      ).pipe(timeout(queueTimeout)) // throw an error if a value is not emitted before timeout
    );
  }

  private async _completeJob(
    report: SavedReport,
    output: CompletedReportOutput
  ): Promise<{ report: SavedReport; output: ReportOutput }> {
    let docId = `/${report._index}/_doc/${report._id}`;
    const logger = this.logger.get(report._id);

    logger.debug(`Saving ${report.jobtype} to ${docId}.`);

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

    logger.info(`Saved ${report.jobtype} job ${docId}`);
    report._seq_no = resp._seq_no!;
    report._primary_term = resp._primary_term!;

    // event tracking of completed job
    // const eventTracker = this.getEventTracker(report);
    const byteSize = docOutput.size;
    const timeSinceCreation = completedTime.valueOf() - new Date(report.created_at).valueOf();

    // if (output.metrics?.csv != null) {
    //   eventTracker?.completeJobCsv({
    //     byteSize,
    //     timeSinceCreation,
    //     csvRows: output.metrics.csv.rows ?? -1,
    //   });
    // } else if (output.metrics?.pdf != null || output.metrics?.png != null) {
    //   const { width, height } = report.payload.layout?.dimensions ?? {};
    //   eventTracker?.completeJobScreenshot({
    //     byteSize,
    //     timeSinceCreation,
    //     screenshotLayout: report.payload.layout?.id ?? 'preserve_layout',
    //     numPages: output.metrics.pdf?.pages ?? -1,
    //     screenshotPixels: Math.round((width ?? 0) * (height ?? 0)),
    //   });
    // }

    return { report, output: docOutput };
  }

  // Generic is used to let TS infer the return type at call site.
  private async throwIfKibanaShutsDown<T>(): Promise<T> {
    await Rx.firstValueFrom(this.reporting.getKibanaShutdown$());
    throw new KibanaShuttingDownError();
  }

  private getFakeKibanaRequest(apiKey: string) {
    const requestHeaders: Headers = {};

    requestHeaders.authorization = `ApiKey ${apiKey}`;

    // TODO pass spaceId
    const path = addSpaceIdToPath('/', 'default');

    const fakeRawRequest: FakeRawRequest = {
      headers: requestHeaders,
      path: '/',
    };

    const fakeRequest = kibanaRequestFactory(fakeRawRequest);
    this.basePathService?.set(fakeRequest, path);

    return fakeRequest;
  }

  /*
   * Provides a TaskRunner for Task Manager
   */
  private getTaskRunner(): TaskRunCreatorFunction {
    // Keep a separate local stack for each task run
    return ({ taskInstance }: RunContext) => {
      let docId: string;
      const cancellationToken = new CancellationToken();
      const {
        params: reportTaskParams,
        retryAt: taskRetryAt,
        startedAt: taskStartedAt,
        apiKey,
      } = taskInstance;

      return {
        run: async () => {
          const now = new Date().toISOString();
          this.logger.info(`STARTING SCHEDULE REPORT TASK - ${JSON.stringify(taskInstance)}`);
          let report: SavedReport | undefined;
          let cronSchedule: string | undefined;
          let finalOutput: ReportOutput | undefined;
          let contentStream: ContentStream | undefined;
          let notifyEmail: string | undefined;

          // find the job in the store
          const task = reportTaskParams as ReportTaskParams;
          docId = task?.id;

          try {
            const store = await this.getStore();
            const reportDoc = await store.findReportFromTask(task); // receives seq_no and primary_term
            this.logger.info(`report ${JSON.stringify(reportDoc)}`);

            cronSchedule = reportDoc.cron_schedule;
            notifyEmail = reportDoc.notify;
            this.logger.info(`cronSchedule ${cronSchedule}`);

            const jobTypeId = reportDoc.jobtype;
            const exportType = this.reporting.getExportTypesRegistry().getByJobType(jobTypeId);

            if (exportType == null) {
              throw new Error(`Job type ${jobTypeId} does not exist in the registry!`);
            }
            if (!exportType.createJob) {
              throw new Error(`Job type ${jobTypeId} is not a valid instance!`);
            }

            const job = reportDoc.payload;

            // reset the now time if it exists
            if (job.forceNow) {
              job.forceNow = now;
            }

            // Add the report to the report store
            const m = moment();
            const queueTimeout = durationToNumber(this.config.queue.timeout);
            report = await store.addReport(
              new Report({
                jobtype: exportType.jobType,
                created_by: reportDoc.created_by,
                scheduled_id: docId,
                payload: job,
                migration_version: reportDoc.migration_version,
                meta: reportDoc.meta,
                kibana_id: this.kibanaId,
                kibana_name: this.kibanaName,
                max_attempts: this.getMaxAttempts(),
                started_at: m.toISOString(),
                timeout: queueTimeout,
                process_expiration: m.add(queueTimeout).toISOString(),
                status: JOB_STATUS.PROCESSING,
              })
            );

            this.logger.info(`created report ${JSON.stringify(report)}`);
          } catch (failedToClaim) {
            // error claiming report - log the error
            // could be version conflict, or too many attempts or no longer connected to ES
            errorLogger(this.logger, `Error in claiming ${docId}`, failedToClaim);
          }

          if (!report) {
            throw new Error(`malformed report`);
          }

          // if (!report) {
          //   this.reporting.untrackReport(jobId);

          //   if (isLastAttempt) {
          //     errorLogger(this.logger, `Job ${jobId} failed too many times. Exiting...`);
          //     return;
          //   }

          //   const errorMessage = `Job ${jobId} could not be claimed. Exiting...`;
          //   errorLogger(this.logger, errorMessage);

          //   // Throw so Task manager can clean up the failed task
          //   throw new Error(errorMessage);
          // }

          const { jobtype: jobType } = report;
          const logger = this.logger.get(docId);
          const fakeRequest = this.getFakeKibanaRequest(apiKey!);

          // logger.info(
          //   `Starting ${jobType} report ${jobId}: attempt ${attempts} of ${maxAttempts}.`
          // );
          // logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);

          // const eventLog = this.reporting.getEventLogger(
          //   new Report({ ...task, _id: task.id, _index: task.index })
          // );

          try {
            const jobContentEncoding = this.getJobContentEncoding(jobType);
            contentStream = await getContentStream(
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

            const output = await Promise.race<TaskRunResult>([
              this._performJob(
                task,
                { retryAt: taskRetryAt, startedAt: taskStartedAt },
                fakeRequest,
                cancellationToken,
                contentStream!,
                now
              ),
              this.throwIfKibanaShutsDown(),
            ]);

            contentStream.end();

            logger.debug(`Begin waiting for the stream's pending callbacks...`);
            await finishedWithNoPendingCallbacks(contentStream);
            logger.info(`The stream's pending callbacks have completed.`);

            report._seq_no = contentStream.getSeqNo()!;
            report._primary_term = contentStream.getPrimaryTerm()!;

            // eventLog.logExecutionComplete({
            //   ...(output.metrics ?? {}),
            //   byteSize: stream.bytesWritten,
            // });

            if (output) {
              logger.debug(`Job output size: ${contentStream.bytesWritten} bytes.`);
              // Update the job status to "completed"
              const { report: completedReport, output: completedOutput } = await this._completeJob(
                report,
                {
                  ...output,
                  size: contentStream.bytesWritten,
                }
              );
              report = completedReport;
              finalOutput = completedOutput;
            }
            // untrack the report for concurrency awareness
            logger.debug(`Stopping ${docId}.`);
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
            // this.reporting.untrackReport(jobId);
            logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);
          }

          try {
            if (
              this.unsecuredActionsClient &&
              finalOutput &&
              contentStream?.content() &&
              notifyEmail
            ) {
              let extension = 'pdf';
              if (jobType.toLowerCase().includes('png')) {
                extension = 'png';
              }
              const response = await this.unsecuredActionsClient.bulkEnqueueExecution('reporting', [
                {
                  id: EMAIL,
                  params: {
                    to: [notifyEmail],
                    subject: `Scheduled Report for ${now}`,
                    message: `Here's your report!`,
                    attachments: [
                      {
                        content: contentStream?.content(),
                        contentType: finalOutput.content_type,
                        filename: `report.${extension}`,
                        encoding: 'base64',
                      },
                    ],
                  },
                },
              ]);

              logger.info(`Email action scheduled: ${JSON.stringify(response)}`);
            }
          } catch (err) {
            logger.error(`Unable to schedule email action for this scheduled report`);
          }

          let runAt: Date | undefined;
          if (!cronSchedule) {
            logger.error('No cron schedule found for the report');
          } else {
            const dt = cron.sendAt(cronSchedule);
            runAt = dt.toJSDate();
            logger.info(`The job would next run at: ${dt.toUTC()}`);
          }

          return {
            ...(runAt ? { runAt } : {}),
            state: {},
          };
        },

        /*
         * Called by Task Manager to stop the report execution process in case
         * of timeout or server shutdown
         */
        cancel: async () => {
          if (docId) {
            this.logger.get(docId).warn(`Cancelling job ${docId}...`);
          }
          cancellationToken.cancel();
        },
      };
    };
  }

  public getTaskDefinition() {
    // round up from ms to the nearest second
    const queueTimeout = Math.ceil(numberToDuration(this.config.queue.timeout).asSeconds()) + 's';

    return {
      type: this.TYPE,
      title: 'Reporting: run scheduled reports',
      createTaskRunner: this.getTaskRunner(),
      timeout: queueTimeout,
      maxConcurrency: 1,
      maxAttempts: 1,
    };
  }

  public async scheduleTask(params: ReportTaskParams, apiKey: string, cronSchedule: string) {
    const dt = cron.sendAt(cronSchedule);
    this.logger.info(`The job would next run at: ${dt.toUTC()}`);

    const taskInstance: ReportingExecuteTaskInstance = {
      taskType: this.TYPE,
      state: {},
      params,
      runAt: dt.toJSDate(),
    };

    return await this.getTaskManagerStart().schedule(taskInstance, { apiKey });
  }

  public getStatus() {
    if (this.taskManagerStart) {
      return ReportingTaskStatus.INITIALIZED;
    }

    return ReportingTaskStatus.UNINITIALIZED;
  }
}
