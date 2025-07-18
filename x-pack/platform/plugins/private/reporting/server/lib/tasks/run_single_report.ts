/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { KibanaRequest } from '@kbn/core/server';
import { QueueTimeoutError, ReportingError } from '@kbn/reporting-common';
import type { ConcreteTaskInstance, TaskInstance } from '@kbn/task-manager-plugin/server';

import { REPORTING_EXECUTE_TYPE, ReportTaskParams } from '.';
import {
  isExecutionError,
  mapToReportingError,
} from '../../../common/errors/map_to_reporting_error';
import { SavedReport } from '../store';
import type { ReportProcessingFields } from '../store/store';
import { errorLogger } from './error_logger';
import { PrepareJobResults, RunReportTask } from './run_report';

type SingleReportTaskInstance = Omit<TaskInstance, 'params'> & {
  params: ReportTaskParams;
};
export class RunSingleReportTask extends RunReportTask<ReportTaskParams> {
  public get TYPE() {
    return REPORTING_EXECUTE_TYPE;
  }

  private async claimJob(task: ReportTaskParams): Promise<SavedReport> {
    const store = await this.opts.reporting.getStore();
    const report = await store.findReportFromTask(task); // receives seq_no and primary_term
    const logger = this.logger.get(report._id);

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
          errorLogger(logger, 'Error executing report', report.error);
        }
        err = new QueueTimeoutError(
          `Max attempts reached (${maxAttempts}). Queue timeout reached.`
        );
      }
      await this.failJob(report, err);
      throw err;
    }

    const startTime = m.toISOString();
    const expirationTime = m.add(this.queueTimeout).toISOString();

    const doc: ReportProcessingFields = {
      kibana_id: this.kibanaId,
      kibana_name: this.kibanaName,
      attempts: report.attempts + 1,
      max_attempts: maxAttempts,
      started_at: startTime,
      timeout: this.queueTimeout,
      process_expiration: expirationTime,
    };

    const claimedReport = new SavedReport({ ...report, ...doc });

    logger.info(
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

  protected async prepareJob(taskInstance: ConcreteTaskInstance): Promise<PrepareJobResults> {
    const { attempts: taskAttempts, params: reportTaskParams } = taskInstance;

    let report: SavedReport | undefined;
    const isLastAttempt = taskAttempts >= this.getMaxAttempts();

    // find the job in the store and set status to processing
    const task = reportTaskParams as ReportTaskParams;
    const jobId = task?.id;

    try {
      if (!jobId) {
        throw new Error('Invalid report data provided in scheduled task!');
      }

      // Update job status to claimed
      report = await this.claimJob(task);
    } catch (failedToClaim) {
      // error claiming report - log the error
      // could be version conflict, or too many attempts or no longer connected to ES
      errorLogger(this.logger, `Error in claiming ${jobId}`, failedToClaim);
    }

    return { isLastAttempt, jobId, report, task };
  }

  protected getMaxAttempts() {
    return this.opts.config.capture.maxAttempts ?? 1;
  }

  protected async notify(): Promise<void> {}

  public getTaskDefinition() {
    const queueTimeout = this.getQueueTimeout();
    const maxConcurrency = this.getMaxConcurrency();
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

  public async scheduleTask(request: KibanaRequest, params: ReportTaskParams) {
    const reportingHealth = await this.opts.reporting.getHealthInfo();
    const shouldScheduleWithApiKey =
      reportingHealth.hasPermanentEncryptionKey && reportingHealth.isSufficientlySecure;
    const taskInstance: SingleReportTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params,
    };

    return shouldScheduleWithApiKey
      ? await this.getTaskManagerStart().schedule(taskInstance, { request })
      : await this.getTaskManagerStart().schedule(taskInstance);
  }
}
