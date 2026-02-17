/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PUBLIC_ROUTES } from '@kbn/reporting-common';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ScheduleType } from '@kbn/reporting-server';
import { getCounters } from '..';
import type { SavedReport } from '../../../lib/store';
import { Report } from '../../../lib/store';
import type { ReportingJobResponse } from '../../../types';
import type { RequestParams } from './request_handler';
import { RequestHandler } from './request_handler';

const validation = {
  params: schema.object({ exportType: schema.string({ minLength: 2 }) }),
  body: schema.nullable(schema.object({ jobParams: schema.maybe(schema.string()) })),
  query: schema.nullable(schema.object({ jobParams: schema.string({ defaultValue: '' }) })),
};

/**
 * Handles the common parts of requests to generate a report
 * Serves report job handling in the context of the request to generate the report
 */
export class GenerateRequestHandler extends RequestHandler<
  (typeof validation)['params'],
  (typeof validation)['query'],
  (typeof validation)['body'],
  SavedReport
> {
  public static getValidation() {
    return validation;
  }

  public async enqueueJob(params: RequestParams) {
    const { exportTypeId, jobParams } = params;
    const { reporting, logger, req, user } = this.opts;

    const store = await reporting.getStore();
    const { version, job, jobType, name } = await this.createJob(exportTypeId, jobParams);

    const spaceId = reporting.getSpaceId(req, logger);

    // Encrypt request headers to store for the running report job to authenticate itself with Kibana
    const headers = await this.encryptHeaders();

    const payload = {
      ...job,
      headers,
      title: job.title,
      objectType: jobParams.objectType,
      browserTimezone: jobParams.browserTimezone,
      version,
      spaceId,
    };

    // Add the report to ReportingStore to show as pending
    const report = await store.addReport(
      new Report({
        jobtype: jobType,
        created_by: user ? user.username : false,
        payload,
        migration_version: version,
        space_id: spaceId || DEFAULT_SPACE_ID,
        meta: {
          // telemetry fields
          objectType: jobParams.objectType,
          layout: jobParams.layout?.id,
          isDeprecated: job.isDeprecated,
        },
      })
    );
    logger.debug(`Successfully stored pending job: ${report._index}/${report._id}`);

    // Schedule the report with Task Manager
    const task = await reporting.scheduleTask(req, report.toReportTaskJSON());
    logger.info(
      `Scheduled ${name} reporting task. Task ID: task:${task.id}. Report ID: ${report._id}`,
      { tags: [report._id] }
    );

    // Log the action with event log
    reporting.getEventLogger(report, task).logScheduleTask();
    return report;
  }

  public async handleRequest(params: RequestParams) {
    const { exportTypeId, jobParams } = params;
    const { reporting, req, res, path } = this.opts;

    const counters = getCounters(
      req.route.method,
      path.replace(/{exportType}/, exportTypeId),
      reporting.getUsageCounter()
    );

    const checkErrorResponse = await this.checkLicense(exportTypeId);
    if (checkErrorResponse) {
      return checkErrorResponse;
    }

    let report: Report | undefined;
    try {
      report = await this.enqueueJob(params);
      const { basePath } = reporting.getServerInfo();
      const publicDownloadPath = basePath + PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX;

      // return task manager's task information and the download URL
      counters.usageCounter();
      const eventTracker = reporting.getEventTracker(
        report._id,
        exportTypeId,
        jobParams.objectType
      );
      eventTracker?.createReport({
        isDeprecated: Boolean(report.payload.isDeprecated),
        isPublicApi: path.match(/internal/) === null,
        scheduleType: ScheduleType.SINGLE,
      });

      return res.ok<ReportingJobResponse>({
        headers: { 'content-type': 'application/json' },
        body: {
          path: `${publicDownloadPath}/${report._id}`,
          job: report.toApiJSON(),
        },
      });
    } catch (err) {
      return this.handleError(err, counters, report?.jobtype);
    }
  }
}
