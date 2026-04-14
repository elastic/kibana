/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { KibanaRequest } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskInstance } from '@kbn/task-manager-plugin/server';

import { ScheduleType } from '@kbn/reporting-server';
import { EXPORT_TYPE_SINGLE } from '@kbn/reporting-common';
import type { ReportTaskParams } from '.';
import { REPORTING_EXECUTE_TYPE } from '.';
import { SavedReport } from '../store';
import type { ReportProcessingFields } from '../store/store';
import { errorLogger } from './error_logger';
import type { PrepareJobResults } from './run_report';
import { RunReportTask } from './run_report';

type SingleReportTaskInstance = Omit<TaskInstance, 'params'> & {
  params: ReportTaskParams;
};
export class RunSingleReportTask extends RunReportTask<ReportTaskParams> {
  public readonly exportType = EXPORT_TYPE_SINGLE;

  public get TYPE() {
    return REPORTING_EXECUTE_TYPE;
  }

  private async claimJob(task: ReportTaskParams): Promise<SavedReport> {
    const store = await this.opts.reporting.getStore();
    const report = await store.findReportFromTask(task); // receives seq_no and primary_term

    if (report.status === 'completed') {
      throw new Error(`Can not claim the report job: it is already completed!`);
    }

    const m = moment();
    const startTime = m.toISOString();
    const expirationTime = m.add(this.queueTimeout).toISOString();

    const doc: ReportProcessingFields = {
      kibana_id: this.kibanaId,
      kibana_name: this.kibanaName,
      attempts: report.attempts + 1,
      max_attempts: this.getMaxAttempts().maxTaskAttempts,
      started_at: startTime,
      timeout: this.queueTimeout,
      process_expiration: expirationTime,
    };

    const claimedReport = new SavedReport({ ...report, ...doc });

    this.logger.info(
      `Claiming ${claimedReport.jobtype} ${report._id} ` +
        `[_index: ${report._index}] ` +
        `[_seq_no: ${report._seq_no}] ` +
        `[_primary_term: ${report._primary_term}] ` +
        `[attempts: ${report.attempts + 1}] ` +
        `[process_expiration: ${expirationTime}]`,
      { tags: [report._id] }
    );

    // event tracking of claimed job
    const eventTracker = this.getEventTracker(report);
    const timeSinceCreation = Date.now() - new Date(report.created_at).valueOf();
    eventTracker?.claimJob({ timeSinceCreation, scheduleType: ScheduleType.SINGLE });

    const resp = await store.setReportClaimed(claimedReport, doc);
    claimedReport._seq_no = resp._seq_no!;
    claimedReport._primary_term = resp._primary_term!;

    return claimedReport;
  }

  protected async prepareJob(taskInstance: ConcreteTaskInstance): Promise<PrepareJobResults> {
    const { params: reportTaskParams } = taskInstance;

    let report: SavedReport | undefined;

    // find the job in the store and set status to processing
    const task = reportTaskParams as ReportTaskParams;
    const jobId = task?.id;

    try {
      if (!jobId) {
        throw new Error('Invalid report data provided in scheduled task!');
      }

      // Update job status to claimed
      report = await this.claimJob(task);

      // Track report in UI
      this.opts.reporting.trackReport(jobId);
    } catch (failedToClaim) {
      // error claiming report - log the error
      // could be version conflict, or too many attempts or no longer connected to ES
      errorLogger(this.logger, `Error in claiming ${jobId}`, failedToClaim);
    }

    return { jobId, report, task };
  }

  protected getMaxAttempts() {
    return {
      maxTaskAttempts: this.opts.config.capture.maxAttempts ?? 1,
      maxRetries: 0, // no retries within a single task run
    };
  }

  protected async notify(): Promise<void> {}

  public getTaskDefinition() {
    const queueTimeout = this.getQueueTimeoutAsInterval();
    const maxConcurrency = this.getMaxConcurrency();
    const maxAttempts = this.getMaxAttempts().maxTaskAttempts;

    return {
      type: REPORTING_EXECUTE_TYPE,
      title: 'Reporting: execute job',
      createTaskRunner: this.getTaskRunner(),
      maxAttempts,
      timeout: queueTimeout,
      maxConcurrency,
    };
  }

  public async scheduleTask(
    request: KibanaRequest,
    params: ReportTaskParams,
    options?: { useInternalUser?: boolean }
  ) {
    const useInternalUser = options?.useInternalUser ?? false;
    const reportingHealth = await this.opts.reporting.getHealthInfo();
    const shouldScheduleWithApiKey =
      reportingHealth.hasPermanentEncryptionKey && reportingHealth.isSufficientlySecure;
    const taskInstance: SingleReportTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params: {
        ...params,
        useInternalUser,
      },
    };

    return shouldScheduleWithApiKey
      ? await this.getTaskManagerStart().schedule(taskInstance, { request })
      : await this.getTaskManagerStart().schedule(taskInstance);
  }
}
