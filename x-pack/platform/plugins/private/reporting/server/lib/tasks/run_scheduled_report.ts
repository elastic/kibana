/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObject } from '@kbn/core/server';
import { numberToDuration } from '@kbn/reporting-common';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type { ConcreteTaskInstance, TaskInstance } from '@kbn/task-manager-plugin/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import {
  SCHEDULED_REPORTING_EXECUTE_TYPE,
  ScheduledReportTaskParams,
  ScheduledReportTaskParamsWithoutSpaceId,
} from '.';
import type { SavedReport } from '../store';
import { errorLogger } from './error_logger';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { PrepareJobResults, RunReportTask } from './run_report';
import { ScheduledReport } from '../store/scheduled_report';
import { ScheduledReportType } from '../../types';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10mb

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
    let reportSO: SavedObject<ScheduledReportType> | undefined;
    const task = scheduledReportTaskParams as ScheduledReportTaskParams;
    const reportSoId = task.id;
    const reportSpaceId = task.spaceId || DEFAULT_SPACE_ID;

    try {
      if (!reportSoId) {
        throw new Error(
          `Invalid scheduled report saved object data provided in scheduled task! - No saved object with id "${reportSoId}"`
        );
      }

      const internalSoClient = await this.opts.reporting.getInternalSoClient();
      reportSO = await internalSoClient.get<ScheduledReportType>(
        SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        reportSoId,
        { namespace: reportSpaceId }
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

    return {
      isLastAttempt: false,
      jobId: jobId!,
      report,
      task: report?.toReportTaskJSON(),
      reportSO,
    };
  }

  protected getMaxAttempts() {
    return undefined;
  }

  protected async notify(
    report: SavedReport,
    taskInstance: ConcreteTaskInstance,
    output: TaskRunResult,
    byteSize: number,
    reportSO?: SavedObject<ScheduledReportType>,
    spaceId?: string
  ): Promise<void> {
    try {
      const { runAt, params } = taskInstance;
      const task = params as ScheduledReportTaskParams;
      if (!reportSO) {
        const internalSoClient = await this.opts.reporting.getInternalSoClient();
        reportSO = await internalSoClient.get<ScheduledReportType>(
          SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
          task.id,
          { namespace: spaceId }
        );
      }

      const { notification } = reportSO.attributes;
      if (notification && notification.email) {
        if (byteSize > MAX_ATTACHMENT_SIZE) {
          throw new Error('The report is larger than the 10MB limit.');
        }
        if (!this.emailNotificationService) {
          throw new Error('Reporting notification service has not been initialized.');
        }

        const email = notification.email;
        const title = reportSO.attributes.title;
        await this.emailNotificationService.notify({
          reporting: this.opts.reporting,
          index: report._index,
          id: report._id,
          jobType: report.jobtype,
          contentType: output.content_type,
          relatedObject: {
            id: reportSO.id,
            type: reportSO.type,
            namespace: spaceId,
          },
          emailParams: {
            to: email.to,
            cc: email.cc,
            bcc: email.bcc,
            subject: `${title} [${runAt.toISOString()}] scheduled report`,
            spaceId,
          },
        });
      }
    } catch (error) {
      const message = `Error sending notification for scheduled report: ${error.message}`;
      await this.saveExecutionWarning(
        report,
        {
          ...output,
          size: byteSize,
        },
        message
      ).catch((failedToSaveWarning) => {
        errorLogger(
          this.logger,
          `Error in saving execution warning ${report._id}`,
          failedToSaveWarning
        );
      });
    }
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

  public async scheduleTask(
    request: KibanaRequest,
    params: ScheduledReportTaskParamsWithoutSpaceId
  ) {
    const spaceId = this.opts.reporting.getSpaceId(request, this.logger);
    const taskInstance: ScheduledReportTaskInstance = {
      id: params.id,
      taskType: SCHEDULED_REPORTING_EXECUTE_TYPE,
      state: {},
      params: {
        id: params.id,
        spaceId: spaceId || DEFAULT_SPACE_ID,
        jobtype: params.jobtype,
      },
      schedule: params.schedule,
    };
    return await this.getTaskManagerStart().schedule(taskInstance, { request });
  }
}
