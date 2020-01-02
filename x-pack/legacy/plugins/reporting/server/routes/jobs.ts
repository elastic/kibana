/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { API_BASE_URL } from '../../common/constants';
import {
  ServerFacade,
  RequestFacade,
  ReportingResponseToolkit,
  JobDocOutput,
  JobSource,
} from '../../types';
// @ts-ignore
import { jobsQueryFactory } from '../lib/jobs_query';
// @ts-ignore
import { jobResponseHandlerFactory } from './lib/job_response_handler';
import {
  getRouteConfigFactoryDownloadPre,
  getRouteConfigFactoryManagementPre,
} from './lib/route_config_factories';

const MAIN_ENTRY = `${API_BASE_URL}/jobs`;

export function registerJobs(server: ServerFacade) {
  const jobsQuery = jobsQueryFactory(server);
  const getRouteConfig = getRouteConfigFactoryManagementPre(server);
  const getRouteConfigDownload = getRouteConfigFactoryDownloadPre(server);

  // list jobs in the queue, paginated
  server.route({
    path: `${MAIN_ENTRY}/list`,
    method: 'GET',
    options: getRouteConfig(),
    handler: (request: RequestFacade) => {
      const { page: queryPage, size: querySize, ids: queryIds } = request.query;
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
    handler: (request: RequestFacade) => {
      const results = jobsQuery.count(request.pre.management.jobTypes, request.pre.user);
      return results;
    },
  });

  // return the raw output from a job
  server.route({
    path: `${MAIN_ENTRY}/output/{docId}`,
    method: 'GET',
    options: getRouteConfig(),
    handler: (request: RequestFacade) => {
      const { docId } = request.params;

      return jobsQuery.get(request.pre.user, docId, { includeContent: true }).then(
        ({ _source: job }: JobSource<any>): JobDocOutput => {
          if (!job) {
            throw boom.notFound();
          }

          const { jobtype: jobType } = job;
          if (!request.pre.management.jobTypes.includes(jobType)) {
            throw boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`);
          }

          return job.output;
        }
      );
    },
  });

  // return some info about the job
  server.route({
    path: `${MAIN_ENTRY}/info/{docId}`,
    method: 'GET',
    options: getRouteConfig(),
    handler: (request: RequestFacade) => {
      const { docId } = request.params;

      return jobsQuery
        .get(request.pre.user, docId)
        .then(({ _source: job }: JobSource<any>): JobSource<any>['_source'] => {
          if (!job) {
            throw boom.notFound();
          }

          const { jobtype: jobType, payload } = job;
          if (!request.pre.management.jobTypes.includes(jobType)) {
            throw boom.unauthorized(`Sorry, you are not authorized to view ${jobType} info`);
          }

          return {
            ...job,
            payload: {
              ...payload,
              headers: undefined,
            },
          };
        });
    },
  });

  // trigger a download of the output from a job
  const jobResponseHandler = jobResponseHandlerFactory(server);
  server.route({
    path: `${MAIN_ENTRY}/download/{docId}`,
    method: 'GET',
    options: getRouteConfigDownload(),
    handler: async (request: RequestFacade, h: ReportingResponseToolkit) => {
      const { docId } = request.params;

      let response = await jobResponseHandler(
        request.pre.management.jobTypes,
        request.pre.user,
        h,
        { docId }
      );
      const { statusCode } = response;

      if (statusCode !== 200) {
        const logLevel = statusCode === 500 ? 'error' : 'debug';
        server.log(
          [logLevel, 'reporting', 'download'],
          `Report ${docId} has non-OK status: [${statusCode}] Reason: [${JSON.stringify(
            response.source
          )}]`
        );
      }

      if (!response.isBoom) {
        response = response.header('accept-ranges', 'none');
      }

      return response;
    },
  });
}
