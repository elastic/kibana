/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { schema } from '@kbn/config-schema';
import { isEmpty, omit } from 'lodash';
import { RruleSchedule, scheduleRruleSchema } from '@kbn/task-manager-plugin/server';
import { RawNotification } from '../../../saved_objects/scheduled_report/schemas/latest';
import { rawNotificationSchema } from '../../../saved_objects/scheduled_report/schemas/v1';
import {
  ScheduledReportApiJSON,
  ScheduledReportType,
  ScheduledReportingJobResponse,
} from '../../../types';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { RequestHandler, RequestParams } from './request_handler';
import { transformRawScheduledReportToReport } from './lib';

// Using the limit specified in the cloud email service limits
// https://www.elastic.co/docs/explore-analyze/alerts-cases/watcher/enable-watcher#cloud-email-service-limits
const MAX_ALLOWED_EMAILS = 30;

const validation = {
  params: schema.object({ exportType: schema.string({ minLength: 2 }) }),
  body: schema.object({
    schedule: scheduleRruleSchema,
    notification: schema.maybe(rawNotificationSchema),
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
  (typeof validation)['body'],
  ScheduledReportApiJSON
> {
  public static getValidation() {
    return validation;
  }

  public getSchedule(): RruleSchedule {
    let rruleDef: null | RruleSchedule['rrule'] = null;
    const req = this.opts.req;
    const res = this.opts.res;

    const { schedule } = req.body;
    const { rrule } = schedule ?? {};
    rruleDef = rrule;

    if (isEmpty(rruleDef)) {
      throw res.customError({
        statusCode: 400,
        body: 'A schedule is required to create a scheduled report.',
      });
    }

    return schedule;
  }

  public getNotification(): RawNotification | undefined {
    const { reporting, req, res } = this.opts;

    const { notification } = req.body;
    if (isEmpty(notification) || isEmpty(notification.email)) {
      return undefined;
    }

    const allEmails = new Set([
      ...(notification.email.to || []),
      ...(notification.email.bcc || []),
      ...(notification.email.cc || []),
    ]);

    if (allEmails.size === 0) {
      return undefined;
    }

    if (allEmails.size > MAX_ALLOWED_EMAILS) {
      throw res.customError({
        statusCode: 400,
        body: `Maximum number of recipients exceeded: cannot specify more than ${MAX_ALLOWED_EMAILS} recipients.`,
      });
    }

    const invalidEmails = reporting.validateNotificationEmails([...allEmails]);
    if (invalidEmails) {
      throw res.customError({
        statusCode: 400,
        body: `Invalid email address(es): ${invalidEmails}`,
      });
    }

    return notification;
  }

  public async enqueueJob(params: RequestParams) {
    const { exportTypeId, jobParams, schedule, notification } = params;
    const { reporting, logger, req, user } = this.opts;

    const soClient = await reporting.getSoClient(req);
    const { version, job, jobType } = await this.createJob(exportTypeId, jobParams);

    const payload = {
      ...job,
      title: job.title,
      objectType: jobParams.objectType,
      browserTimezone: jobParams.browserTimezone,
      version,
      spaceId: reporting.getSpaceId(req, logger),
    };

    // TODO - extract saved object references before persisting

    const attributes = {
      createdAt: moment.utc().toISOString(),
      createdBy: user ? user.username : false,
      enabled: true,
      jobType,
      meta: {
        // telemetry fields
        isDeprecated: job.isDeprecated,
        layout: jobParams.layout?.id,
        objectType: jobParams.objectType,
      },
      migrationVersion: version,
      ...(notification ? { notification } : {}),
      title: job.title,
      payload: JSON.stringify(omit(payload, 'forceNow')),
      schedule: schedule!,
    };

    // Create a scheduled report saved object
    const report = await soClient.create<ScheduledReportType>(
      SCHEDULED_REPORT_SAVED_OBJECT_TYPE,
      attributes
    );
    logger.debug(`Successfully created scheduled report: ${report.id}`);

    // TODO - Schedule the report with Task Manager

    return transformRawScheduledReportToReport(report);
  }

  public async handleRequest(params: RequestParams) {
    const { exportTypeId, jobParams } = params;
    const { reporting, res } = this.opts;

    const checkErrorResponse = await this.checkLicenseAndTimezone(
      exportTypeId,
      jobParams.browserTimezone
    );
    if (checkErrorResponse) {
      return checkErrorResponse;
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

    let report: ScheduledReportApiJSON | undefined;
    try {
      report = await this.enqueueJob(params);
      return res.ok<ScheduledReportingJobResponse>({
        headers: { 'content-type': 'application/json' },
        body: {
          job: report,
        },
      });
    } catch (err) {
      return this.handleError(err, undefined, report?.jobtype);
    }
  }
}
