/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import boom from 'boom';
import { API_BASE_URL } from '../../common/constants';
import {
  ServerFacade,
  ExportTypesRegistry,
  Logger,
  ReportingResponseToolkit,
  JobDocOutput,
  JobSource,
  ListQuery,
} from '../../types';
// @ts-ignore
import { jobsQueryFactory } from '../lib/jobs_query';
// @ts-ignore
import { jobResponseHandlerFactory } from './lib/job_response_handler';
import {
  getRouteConfigFactoryDownloadPre,
  getRouteConfigFactoryManagementPre,
} from './lib/route_config_factories';
import { makeRequestFacade } from './lib/make_request_facade';

const MAIN_ENTRY = `${API_BASE_URL}/jobs`;

export function registerJobInfoRoutes(
  server: ServerFacade,
  exportTypesRegistry: ExportTypesRegistry,
  logger: Logger
) {
  const jobsQuery = jobsQueryFactory(server);
  const getRouteConfig = getRouteConfigFactoryManagementPre(server);
  const getRouteConfigDownload = getRouteConfigFactoryDownloadPre(server);

  // list jobs in the queue, paginated
  server.route({
    path: `${MAIN_ENTRY}/list`,
    method: 'GET',
    options: getRouteConfig(),
    handler: (legacyRequest: Legacy.Request) => {
      const request = makeRequestFacade(legacyRequest);
      const { page: queryPage, size: querySize, ids: queryIds } = request.query as ListQuery;
      const page = parseInt(queryPage, 10) || 0;
      const size = Math.min(100, parseInt(querySize, 10) || 10);
      const jobIds = queryIds ? queryIds.split(',') : null;

      const results = jobsQuery.list(
        request.pre.management.jobTypes,
        request.pre.user,
        page,
        size,
        jobIds
      );
      return results;
    },
  });

  // return the count of all jobs in the queue
  server.route({
    path: `${MAIN_ENTRY}/count`,
    method: 'GET',
    options: getRouteConfig(),
    handler: (legacyRequest: Legacy.Request) => {
      const request = makeRequestFacade(legacyRequest);
      const results = jobsQuery.count(request.pre.management.jobTypes, request.pre.user);
      return results;
    },
  });

  // return the raw output from a job
  server.route({
    path: `${MAIN_ENTRY}/output/{docId}`,
    method: 'GET',
    options: getRouteConfig(),
    handler: (legacyRequest: Legacy.Request) => {
      const request = makeRequestFacade(legacyRequest);
      const { docId } = request.params;

      return jobsQuery.get(request.pre.user, docId, { includeContent: true }).then(
        (result): JobDocOutput => {
          if (!result) {
            throw boom.notFound();
          }
          const {
            _source: { jobtype: jobType, output: jobOutput },
          } = result;

          if (!request.pre.management.jobTypes.includes(jobType)) {
            throw boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`);
          }

          return jobOutput;
        }
      );
    },
  });

  // return some info about the job
  server.route({
    path: `${MAIN_ENTRY}/info/{docId}`,
    method: 'GET',
    options: getRouteConfig(),
    handler: (legacyRequest: Legacy.Request) => {
      const request = makeRequestFacade(legacyRequest);
      const { docId } = request.params;

      return jobsQuery.get(request.pre.user, docId).then((result): JobSource<any>['_source'] => {
        if (!result) {
          throw boom.notFound();
        }

        const { _source: job } = result;
        const { jobtype: jobType, payload: jobPayload } = job;
        if (!request.pre.management.jobTypes.includes(jobType)) {
          throw boom.unauthorized(`Sorry, you are not authorized to view ${jobType} info`);
        }

        return {
          ...job,
          payload: {
            ...jobPayload,
            headers: undefined,
          },
        };
      });
    },
  });

  // trigger a download of the output from a job
  const jobResponseHandler = jobResponseHandlerFactory(server, exportTypesRegistry);
  server.route({
    path: `${MAIN_ENTRY}/download/{docId}`,
    method: 'GET',
    options: getRouteConfigDownload(),
    handler: async (legacyRequest: Legacy.Request, h: ReportingResponseToolkit) => {
      const request = makeRequestFacade(legacyRequest);
      const { docId } = request.params;

      let response = await jobResponseHandler(
        request.pre.management.jobTypes,
        request.pre.user,
        h,
        { docId }
      );
      const { statusCode } = response;

      if (statusCode !== 200) {
        if (statusCode === 500) {
          logger.error(`Report ${docId} has failed: ${JSON.stringify(response.source)}`);
        } else {
          logger.debug(
            `Report ${docId} has non-OK status: [${statusCode}] Reason: [${JSON.stringify(
              response.source
            )}]`
          );
        }
      }

      if (!response.isBoom) {
        response = response.header('accept-ranges', 'none');
      }

      return response;
    },
  });
}
