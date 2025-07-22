/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObject } from '@kbn/core/server';
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
    let scheduledReport: SavedObject<ScheduledReportType> | undefined;
    const task = scheduledReportTaskParams as ScheduledReportTaskParams;
    const scheduledReportId = task.id;
    const reportSpaceId = task.spaceId || DEFAULT_SPACE_ID;

    try {
      if (!scheduledReportId) {
        throw new Error(
          `Invalid scheduled_report saved object data provided in scheduled task! - No saved object with id "${scheduledReportId}"`
        );
      }

      const internalSoClient = await this.opts.reporting.getInternalSoClient();
      scheduledReport = await internalSoClient.get<ScheduledReportType>(
        SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
        scheduledReportId,
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
          scheduledReport,
          spaceId: reportSpaceId,
        })
      );

      jobId = report._id;
      if (!jobId) {
        throw new Error(`Unable to store report document in ReportingStore`);
      }
    } catch (failedToClaim) {
      // error claiming report - log the error
      errorLogger(
        this.logger,
        `Error in running scheduled report ${scheduledReportId}`,
        failedToClaim
      );
    }

    return {
      isLastAttempt: false,
      jobId: jobId!,
      report,
      task: report?.toReportTaskJSON(),
      scheduledReport,
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
    scheduledReport?: SavedObject<ScheduledReportType>,
    spaceId?: string
  ): Promise<void> {
    try {
      const { runAt, params } = taskInstance;
      const task = params as ScheduledReportTaskParams;
      if (!scheduledReport) {
        const internalSoClient = await this.opts.reporting.getInternalSoClient();
        scheduledReport = await internalSoClient.get<ScheduledReportType>(
          SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
          task.id,
          { namespace: spaceId }
        );
      }

      const { notification } = scheduledReport.attributes;
      if (notification && notification.email) {
        if (byteSize > MAX_ATTACHMENT_SIZE) {
          throw new Error('The report is larger than the 10MB limit.');
        }
        if (!this.emailNotificationService) {
          throw new Error('Reporting notification service has not been initialized.');
        }

        const email = notification.email;
        const title = scheduledReport.attributes.title;
        const extension = this.getJobContentExtension(report.jobtype);

        await this.emailNotificationService.notify({
          reporting: this.opts.reporting,
          index: report._index,
          id: report._id,
          filename: `${title}-${runAt.toISOString()}.${extension}`,
          contentType: output.content_type,
          relatedObject: {
            id: scheduledReport.id,
            type: scheduledReport.type,
            namespace: spaceId,
          },
          emailParams: {
            to: email.to,
            cc: email.cc,
            bcc: email.bcc,
            subject: `${title}-${runAt.toISOString()} scheduled report`,
            spaceId,
          },
        });
      }
    } catch (error) {
      const message = `Error sending notification for scheduled report: ${error.message}`;
      this.saveExecutionWarning(
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
    const queueTimeout = this.getQueueTimeout();
    const maxConcurrency = this.getMaxConcurrency();

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
