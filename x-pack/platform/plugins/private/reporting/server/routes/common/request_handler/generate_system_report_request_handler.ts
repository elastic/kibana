/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { TypeOf } from '@kbn/config-schema';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  Logger,
  IKibanaResponse,
} from '@kbn/core/server';
import { PUBLIC_ROUTES } from '@kbn/reporting-common';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { JobParamsCSV } from '@kbn/reporting-export-types-csv-common';

import type { ReportingCore } from '../../..';
import type { ReportingRequestHandlerContext, ReportingUser } from '../../../types';
import type { SavedReport } from '../../../lib/store';
import { Report } from '../../../lib/store';
import type { RequestParams } from './request_handler';
import {
  RequestHandler,
  type ParamsValidation,
  type QueryValidation,
  type BodyValidation,
} from './request_handler';
import { getAuthorizedUser } from '../get_authorized_user';

export interface InternalReportParams {
  title: string;
  searchSource: SerializedSearchSourceFields;
  timezone?: string;
}

export interface GenerateSystemReportRequestParams<
  P extends typeof ParamsValidation = typeof ParamsValidation,
  Q extends typeof QueryValidation = typeof QueryValidation,
  B extends typeof BodyValidation = typeof BodyValidation
> {
  reportParams: InternalReportParams;
  request: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>;
  response: KibanaResponseFactory;
  context: RequestHandlerContext;
}

interface GenerateSystemReportResult {
  report: SavedReport;
  downloadUrl: string;
}

export type HandleResponseFunc = (
  result: GenerateSystemReportResult | null,
  err?: Error
) => Promise<IKibanaResponse>;

const SUPPORTED_INDICES = ['.fleet-agents'];

/**
 * Creates a request handler that can be configured by other plugin routes
 * to encapsulate creating reports derived from system indices
 */
export class GenerateSystemReportRequestHandler<
  P extends typeof ParamsValidation,
  Q extends typeof QueryValidation,
  B extends typeof BodyValidation
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

  public async handleRequest(params: RequestParams & { jobParams: JobParamsCSV }) {
    const { exportTypeId, jobParams } = params;

    const unsupportedErrorResponse = this.checkSupportedExportType(exportTypeId);

    if (unsupportedErrorResponse) {
      return unsupportedErrorResponse;
    }

    const checkErrorResponse = await this.checkLicense(exportTypeId);

    if (checkErrorResponse) {
      return checkErrorResponse;
    }

    const unsupportedIndexErrorResponse = this.checkSupportedIndex(jobParams);

    if (unsupportedIndexErrorResponse) {
      return unsupportedIndexErrorResponse;
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

  private checkSupportedExportType(exportTypeId: string): IKibanaResponse | null {
    if (exportTypeId !== 'csv_searchsource') {
      return this.opts.res.badRequest({
        body: `Unsupported export-type of ${exportTypeId} for system report`,
      });
    }
    return null;
  }

  private checkSupportedIndex(jobParams: JobParamsCSV): IKibanaResponse | null {
    const index =
      typeof jobParams.searchSource.index === 'string'
        ? jobParams.searchSource.index
        : jobParams.searchSource.index?.title;

    if (index && !SUPPORTED_INDICES.includes(index)) {
      return this.opts.res.badRequest({
        body: `Unsupported index of ${index} for system report`,
      });
    }
    return null;
  }
}

export type HandleGenerateSystemReportRequestFunc = ReturnType<
  typeof handleGenerateSystemReportRequest
>;

export async function handleGenerateSystemReportRequest<
  P extends typeof ParamsValidation = typeof ParamsValidation,
  Q extends typeof QueryValidation = typeof QueryValidation,
  B extends typeof BodyValidation = typeof BodyValidation
>(
  reporting: ReportingCore,
  logger: Logger,
  path: string,
  requestParams: GenerateSystemReportRequestParams<P, Q, B>,
  handleResponse: HandleResponseFunc
) {
  const { reportParams, request: req, response: res, context } = requestParams;

  const reportingContext = {
    ...context,
    reporting: Promise.resolve(reporting.getContract()),
  };

  let user: ReportingUser;

  try {
    user = await getAuthorizedUser(reporting, req, { requireSecurity: true });
  } catch (err) {
    logger.error(`Failed to get authorized user: ${err.message}`);
    if (err instanceof Boom.Boom) {
      return res.customError({
        statusCode: err.output.statusCode,
        body: err.output.payload.message,
      });
    }
    throw err;
  }

  const { title, searchSource, timezone } = reportParams;

  const exportTypeId = 'csv_searchsource';
  const jobParams = {
    title,
    searchSource,
    browserTimezone: timezone ?? 'UTC',
    version: reporting.getKibanaPackageInfo().version,
    objectType: 'search',
    columns: searchSource.fields as string[],
  };
  const requestHandler = new GenerateSystemReportRequestHandler<P, Q, B>(
    {
      reporting,
      user,
      context: reportingContext,
      path,
      req,
      res,
      logger,
    },
    {
      handleResponse,
    }
  );

  return requestHandler.handleRequest({
    exportTypeId,
    jobParams,
  });
}
