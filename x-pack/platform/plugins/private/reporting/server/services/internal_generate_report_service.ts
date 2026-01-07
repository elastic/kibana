/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { BaseParams } from '@kbn/reporting-common/types';
import { checkParamsVersion } from '../lib';
import { Report } from '../lib/store';
import type { SavedReport } from '../lib/store';
import type { ReportingCore } from '..';
import type { ReportingRequestHandlerContext, ReportingUser } from '../types';

interface InternalReportingServiceOpts {
  reporting: ReportingCore;
  logger: Logger;
  user?: ReportingUser;
  spaceId?: string;
}

/**
 * System context version of GenerateRequestHandler that can work without a request object.
 * Useful for internal operations like accessing system indices.
 */
export class InternalReportingService {
  constructor(private readonly opts: InternalReportingServiceOpts) {}

  private async createJob(exportTypeId: string, jobParams: BaseParams) {
    const exportType = this.opts.reporting.getExportTypesRegistry().getById(exportTypeId);

    if (exportType == null) {
      throw new Error(`Export type ${exportTypeId} does not exist in the registry!`);
    }

    if (!exportType.createJob) {
      throw new Error(`Export type ${exportTypeId} is not a valid instance!`);
    }

    const version = checkParamsVersion(jobParams, this.opts.logger);

    const job = await exportType.createJob(
      jobParams,
      { reporting: this.opts.reporting },
      undefined as any
    );

    return { job, version, jobType: exportType.jobType, name: exportType.name };
  }

  public async enqueueJob(
    exportTypeId: string,
    jobParams: BaseParams,
    context?: ReportingRequestHandlerContext
  ): Promise<SavedReport> {
    const { reporting, logger, user, spaceId } = this.opts;

    const store = await reporting.getStore();
    const { version, job, jobType, name } = await this.createJob(exportTypeId, jobParams, context);

    const reportSpaceId = spaceId || DEFAULT_SPACE_ID;

    const payload = {
      ...job,
      headers: '',
      title: job.title,
      objectType: jobParams.objectType,
      browserTimezone: jobParams.browserTimezone,
      version,
      spaceId: reportSpaceId,
    };

    const report = await store.addReport(
      new Report({
        jobtype: jobType,
        created_by: user ? user.username : 'system',
        payload,
        migration_version: version,
        space_id: reportSpaceId,
        meta: {
          objectType: jobParams.objectType,
          layout: jobParams.layout?.id,
          isDeprecated: job.isDeprecated,
        },
      })
    );
    logger.debug(`Successfully stored pending job: ${report._index}/${report._id}`);

    const task = await this.opts.reporting.scheduleTaskAsInternalUser(report.toReportTaskJSON());
    logger.info(
      `Scheduled ${name} reporting task as internal user. Task ID: task:${task.id}. Report ID: ${report._id}`,
      { tags: [report._id] }
    );

    reporting.getEventLogger(report, task).logScheduleTask();
    return report;
  }
}
