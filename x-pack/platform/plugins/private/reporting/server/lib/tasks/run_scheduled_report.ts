/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { numberToDuration } from '@kbn/reporting-common';
import type { ConcreteTaskInstance, TaskInstance } from '@kbn/task-manager-plugin/server';

import { SCHEDULED_REPORTING_EXECUTE_TYPE, ScheduledReportTaskParams } from '.';
import type { SavedReport } from '../store';
import { errorLogger } from './error_logger';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { PrepareJobResults, RunReportTask } from './run_report';
import { ScheduledReport } from '../store/scheduled_report';
import { ScheduledReport as ScheduledReportType } from '../../types';

type ScheduledReportTaskInstance = Omit<TaskInstance, 'params'> & {
  params: Omit<ScheduledReportTaskParams, 'schedule'>;
};
export class RunScheduledReportTask extends RunReportTask<ScheduledReportTaskParams> {
  public get TYPE() {
    return SCHEDULED_REPORTING_EXECUTE_TYPE;
  }

  protected async prepareJob(taskInstance: ConcreteTaskInstance): Promise<PrepareJobResults> {
    const { runAt, params: scheduledReportTaskParams } = taskInstance;

    let report: SavedReport | undefined;
    let jobId: string;
    const task = scheduledReportTaskParams as ScheduledReportTaskParams;
    const reportSoId = task.id;

    try {
      if (!reportSoId) {
        throw new Error(
          `Invalid scheduled report saved object data provided in scheduled task! - No saved object with id "${reportSoId}"`
        );
      }

      const internalSoClient = await this.opts.reporting.getSoClient();
      const reportSO = await internalSoClient.get<ScheduledReportType>(
        SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        reportSoId
      );

      const store = await this.opts.reporting.getStore();

      // Add the report to ReportingStore to show as processing
      report = await store.addReport(
        new ScheduledReport({
          runAt,
          kibanaId: this.kibanaId!,
          kibanaName: this.kibanaName!,
          queueTimeout: this.queueTimeout,
          reportSO,
        })
      );

      jobId = report._id;
      if (!jobId) {
        throw new Error(`Unable to store report document in ReportingStore`);
      }
    } catch (failedToClaim) {
      // error claiming report - log the error
      errorLogger(this.logger, `Error in running scheduled report ${reportSoId}`, failedToClaim);
    }

    return { isLastAttempt: false, jobId: jobId!, report, task: report?.toReportTaskJSON() };
  }

  protected getMaxAttempts() {
    return undefined;
  }

  public getTaskDefinition() {
    // round up from ms to the nearest second
    const queueTimeout =
      Math.ceil(numberToDuration(this.opts.config.queue.timeout).asSeconds()) + 's';
    const maxConcurrency = this.opts.config.queue.pollEnabled ? 1 : 0;

    return {
      type: SCHEDULED_REPORTING_EXECUTE_TYPE,
      title: 'Reporting: execute scheduled job',
      createTaskRunner: this.getTaskRunner(),
      timeout: queueTimeout,
      maxConcurrency,
    };
  }

  public async scheduleTask(request: KibanaRequest, params: ScheduledReportTaskParams) {
    const taskInstance: ScheduledReportTaskInstance = {
      id: params.id,
      taskType: SCHEDULED_REPORTING_EXECUTE_TYPE,
      state: {},
      params: {
        id: params.id,
        jobtype: params.jobtype,
      },
      schedule: params.schedule,
    };
    return await this.getTaskManagerStart().schedule(taskInstance, { request });
  }
}
