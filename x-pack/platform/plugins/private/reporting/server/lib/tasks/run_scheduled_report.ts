/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { JOB_STATUS, numberToDuration } from '@kbn/reporting-common';
import type { ConcreteTaskInstance, TaskInstance } from '@kbn/task-manager-plugin/server';

import moment from 'moment';
import { ReportTaskParams, SCHEDULED_REPORTING_EXECUTE_TYPE, ScheduledReportTaskParams } from '.';
import type { SavedReport } from '../store';
import { Report } from '../store';
import { errorLogger } from './error_logger';
import { RawScheduledReport } from '../../saved_objects/scheduled_report/schemas/latest';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { PrepareJobResults, RunReportTask } from './run_report';

type ScheduledReportTaskInstance = Omit<TaskInstance, 'params'> & {
  params: Omit<ScheduledReportTaskParams, 'schedule'>;
};
export class RunScheduledReportTask extends RunReportTask<ScheduledReportTaskParams> {
  public get TYPE() {
    return SCHEDULED_REPORTING_EXECUTE_TYPE;
  }

  protected async prepareJob(taskInstance: ConcreteTaskInstance): Promise<PrepareJobResults> {
    const { params: scheduledReportTaskParams } = taskInstance;

    let report: SavedReport | undefined;
    let jobId: string;
    let reportTask: ReportTaskParams | undefined;
    const task = scheduledReportTaskParams as ScheduledReportTaskParams;
    const reportSoId = task.id;

    try {
      if (!reportSoId) {
        throw new Error(
          `Invalid scheduled report saved object data provided in scheduled task! - No saved object with id "${reportSoId}"`
        );
      }
      if (this.kibanaId == null) {
        throw new Error(`Kibana instance ID is undefined!`);
      }
      if (this.kibanaName == null) {
        throw new Error(`Kibana instance name is undefined!`);
      }

      const internalSoClient = await this.opts.reporting.getSoClient();
      const reportSO = await internalSoClient.get<RawScheduledReport>(
        SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        reportSoId
      );

      const store = await this.opts.reporting.getStore();
      const now = moment.utc();
      const startTime = now.toISOString();
      const expirationTime = now.add(this.queueTimeout).toISOString();

      // Add the report to ReportingStore to show as processing
      report = await store.addReport(
        new Report({
          migration_version: reportSO.attributes.migrationVersion,
          jobtype: reportSO.attributes.jobType,
          created_at: startTime,
          created_by: reportSO.attributes.createdBy as string | false,
          payload: JSON.parse(reportSO.attributes.payload),
          meta: reportSO.attributes.meta,
          status: JOB_STATUS.PROCESSING,
          attempts: 1,
          process_expiration: expirationTime,
          kibana_id: this.kibanaId,
          kibana_name: this.kibanaName,
          max_attempts: 1,
          started_at: startTime,
          timeout: this.queueTimeout,
          scheduled_report_id: reportSoId,
        })
      );

      jobId = report._id;
      if (!jobId) {
        throw new Error(`Unable to store report document in ReportingStore`);
      }

      // Create the reportTask
      reportTask = {
        id: report._id,
        index: report._index,
        attempts: 0,
        meta: report.meta,
        created_at: report.created_at,
        created_by: report.created_by,
        jobtype: report.jobtype,
        payload: {
          ...report.payload,
          forceNow: new Date().toISOString(),
        },
      };
    } catch (failedToClaim) {
      // error claiming report - log the error
      errorLogger(this.logger, `Error in running scheduled report ${reportSoId}`, failedToClaim);
    }

    return { isLastAttempt: false, jobId: jobId!, report, task: reportTask };
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
