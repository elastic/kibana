/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { schema } from '@kbn/config-schema';
import { PUBLIC_ROUTES } from '@kbn/reporting-common';
import { rruleSchedule } from '@kbn/task-manager-plugin/server/saved_objects/schemas/rrule';
import { Rrule } from '@kbn/task-manager-plugin/server/task';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { Report } from '../../../lib/store';
import type { ScheduledReportingJobResponse } from '../../../types';
import { RequestHandler, RequestParams } from './request_handler';

const validation = {
  params: schema.object({ exportType: schema.string({ minLength: 2 }) }),
  body: schema.object({
    schedule: schema.object({
      rrule: rruleSchedule,
    }),
    jobParams: schema.string(),
  }),
  query: schema.nullable(schema.object({})),
};

/**
 * Handles the common parts of requests to generate a report
 * Serves report job handling in the context of the request to generate the report
 */
export class ScheduleRequestHandler extends RequestHandler<
  (typeof validation)['params'],
  (typeof validation)['query'],
  (typeof validation)['body']
> {
  public static getValidation() {
    return validation;
  }

  public getSchedule(): Rrule {
    let rruleDef: null | Rrule = null;
    const req = this.opts.req;
    const res = this.opts.res;

    const { schedule } = req.body;
    const { rrule } = schedule;
    rruleDef = rrule;

    if (!rruleDef) {
      throw res.customError({
        statusCode: 400,
        body: 'A RRULE schedule is required in the POST body',
      });
    }

    return rruleDef;
  }

  public async enqueueJob(params: RequestParams) {
    const { exportTypeId, jobParams, schedule } = params;
    const { reporting, logger, req, user } = this.opts;

    const soClient = await reporting.getSoClient(req);
    const { version, job, jobType, name } = await this.createJob(exportTypeId, jobParams);

    const payload = {
      ...job,
      title: job.title,
      objectType: jobParams.objectType,
      browserTimezone: jobParams.browserTimezone,
      version,
      spaceId: reporting.getSpaceId(req, logger),
    };

    // TODO - references?

    const attributes = {
      jobType,
      createdAt: moment.utc().toISOString(),
      createdBy: user ? user.username : false,
      payload,
      schedule,
      migrationVersion: version,
      meta: {
        // telemetry fields
        objectType: jobParams.objectType,
        layout: jobParams.layout?.id,
        isDeprecated: job.isDeprecated,
      },
    };
    console.log(`attributes ${JSON.stringify(attributes)}`);

    // Create a scheduled report saved object
    const result = await soClient.create(SCHEDULED_REPORT_SAVED_OBJECT_TYPE, attributes, {});
    logger.debug(`Successfully created scheduled report: ${result.id}`);

    // // Schedule the report with Task Manager
    // const task = await reporting.scheduleTask(req, report.toReportTaskJSON());
    // logger.info(
    //   `Scheduled ${name} reporting task. Task ID: task:${task.id}. Report ID: ${result.id}`
    // );

    // // 6. Log the action with event log
    // // reporting.getEventLogger(report, task).logScheduleTask();
    // return report;
  }

  public async handleRequest(params: RequestParams) {
    const { exportTypeId, jobParams } = params;
    const { reporting, context, req, res, path } = this.opts;

    const earlyResponse = await this.checkLicenseAndTimezone(
      exportTypeId,
      jobParams.browserTimezone
    );
    if (earlyResponse) {
      return earlyResponse;
    }

    // check that security requirements are met
    const reportingHealth = await reporting.getHealthInfo();
    if (!reportingHealth.hasPermanentEncryptionKey) {
      return res.forbidden({
        body: `Permanent encryption key must be set for scheduled reporting`,
      });
    }
    if (!reportingHealth.isSufficientlySecure) {
      return res.forbidden({
        body: `Security and API keys must be enabled for scheduled reporting`,
      });
    }

    let report: Report | undefined;
    try {
      /* report = */ await this.enqueueJob(params);
      const { basePath } = reporting.getServerInfo();
      const publicDownloadPath = basePath + PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX;

      // // return task manager's task information and the download URL
      // const eventTracker = reporting.getEventTracker(
      //   report._id,
      //   exportTypeId,
      //   jobParams.objectType
      // );
      // eventTracker?.createReport({
      //   isDeprecated: Boolean(report.payload.isDeprecated),
      //   isPublicApi: path.match(/internal/) === null,
      // });

      return res.ok</* ScheduledReportingJobResponse*/ {}>({
        headers: { 'content-type': 'application/json' },
        body: {
          // job: report.toApiJSON(),
        },
      });
    } catch (err) {
      return this.handleError(err, undefined, report?.jobtype);
    }
  }
}
