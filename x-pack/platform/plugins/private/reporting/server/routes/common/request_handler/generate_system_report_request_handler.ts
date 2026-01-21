/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  Logger,
  IKibanaResponse,
} from '@kbn/core/server';
import { PUBLIC_ROUTES } from '@kbn/reporting-common';
import type { BaseParams } from '@kbn/reporting-common/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import type { ReportingCore } from '../../..';
import type { ReportingRequestHandlerContext, ReportingUser } from '../../../types';
import type { SavedReport } from '../../../lib/store';
import { Report } from '../../../lib/store';
import type { RequestParams } from './request_handler';
import { RequestHandler } from './request_handler';

export interface JobConfig {
  exportTypeId: string;
  jobParams: BaseParams;
}

export interface GenerateSystemReportRequestParams {
  jobConfig: JobConfig;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  context: RequestHandlerContext;
}

const Params = schema.recordOf(schema.string(), schema.string());
const Query = schema.nullable(schema.recordOf(schema.string(), schema.maybe(schema.string())));
const Body = schema.nullable(schema.recordOf(schema.string(), schema.maybe(schema.any())));

interface GenerateSystemReportResult {
  report: SavedReport;
  downloadUrl: string;
}

export type HandleResponseFunc = (
  result: GenerateSystemReportResult | null,
  err?: Error
) => Promise<IKibanaResponse>;
export type CreateJobConfigFunc = () => JobConfig;

/**
 * Creates a request handler that can be configured by other plugin routes
 * to encapsulate creating reports derived from system indices
 */
export class GenerateSystemReportRequestHandler<
  P extends typeof Params,
  Q extends typeof Query,
  B extends typeof Body
> extends RequestHandler<P, Q, B, SavedReport> {
  private handleResponse: HandleResponseFunc;

  constructor(
    opts: {
      reporting: ReportingCore;
      user: ReportingUser;
      context: ReportingRequestHandlerContext;
      path: string;
      req: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>;
      res: KibanaResponseFactory;
      logger: Logger;
    },
    config: {
      handleResponse: HandleResponseFunc;
    }
  ) {
    super(opts);
    this.handleResponse = config.handleResponse;
  }

  public async enqueueJob(params: RequestParams): Promise<SavedReport> {
    const { exportTypeId, jobParams } = params;
    const { reporting, logger, req, user } = this.opts;

    const store = await reporting.getStore();
    const { version, job, jobType, name } = await this.createJob(exportTypeId, jobParams);

    const spaceId = reporting.getSpaceId(req, logger);

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

    const report = await store.addReport(
      new Report({
        jobtype: jobType,
        created_by: user ? user.username : false,
        payload,
        migration_version: version,
        space_id: spaceId || DEFAULT_SPACE_ID,
        meta: {
          objectType: jobParams.objectType,
          layout: jobParams.layout?.id,
          isDeprecated: job.isDeprecated,
        },
      })
    );
    logger.debug(`Successfully stored pending job: ${report._index}/${report._id}`);

    const task = await reporting.scheduleTaskWithInternalES(req, report.toReportTaskJSON());
    logger.info(
      `Scheduled ${name} reporting task using internal ES client. Task ID: task:${task.id}. Report ID: ${report._id}`,
      { tags: [report._id] }
    );

    reporting.getEventLogger(report, task).logScheduleTask();
    return report;
  }

  public async handleRequest(params: RequestParams) {
    const { exportTypeId } = params;
    const checkErrorResponse = await this.checkLicense(exportTypeId);

    if (checkErrorResponse) {
      return checkErrorResponse;
    }

    try {
      const report = await this.enqueueJob(params);

      const { basePath } = this.opts.reporting.getServerInfo();
      const publicDownloadPath = basePath + PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX;

      return this.handleResponse({
        report,
        downloadUrl: `${publicDownloadPath}/${report._id}`,
      });
    } catch (err) {
      return this.handleResponse(null, err);
    }
  }
}

export type HandleGenerateSystemReportRequestFunc = ReturnType<
  typeof handleGenerateSystemReportRequest
>;

export async function handleGenerateSystemReportRequest(
  reporting: ReportingCore,
  logger: Logger,
  path: string,
  requestParams: GenerateSystemReportRequestParams,
  handleResponse: HandleResponseFunc
) {
  const { jobConfig, request: req, response: res, context } = requestParams;
  const { exportTypeId, jobParams } = jobConfig;
  const { securityService } = await reporting.getPluginStartDeps();
  const reportingContext = {
    ...context,
    reporting: Promise.resolve(reporting.getContract()),
  };
  const user = securityService.authc.getCurrentUser(req);

  if (!user) {
    return res.unauthorized({ body: `Sorry, you aren't authenticated` });
  }

  const requestHandler = new GenerateSystemReportRequestHandler(
    {
      reporting,
      user,
      context: reportingContext,
      path,
      req: req as KibanaRequest<TypeOf<typeof Params>, TypeOf<typeof Query>, TypeOf<typeof Body>>,
      res,
      logger,
    },
    {
      handleResponse,
    }
  );

  return await requestHandler.handleRequest({
    exportTypeId,
    jobParams,
  });
}
