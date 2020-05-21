/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { IRouter, IBasePath } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';
import { LevelLogger as Logger } from '../lib';
import { jobsQueryFactory } from '../lib/jobs_query';
import { ReportingSetupDeps } from '../types';
import {
  deleteJobResponseHandlerFactory,
  downloadJobResponseHandlerFactory,
} from './lib/job_response_handler';
import { makeRequestFacade } from './lib/make_request_facade';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';

interface ListQuery {
  page: string;
  size: string;
  ids?: string; // optional field forbids us from extending RequestQuery
}
const MAIN_ENTRY = `${API_BASE_URL}/jobs`;

export async function registerJobInfoRoutes(
  reporting: ReportingCore,
  plugins: ReportingSetupDeps,
  router: IRouter,
  basePath: IBasePath['get'],
  logger: Logger
) {
  const config = reporting.getConfig();
  const getUser = authorizedUserPreRoutingFactory(config, plugins, logger);
  const { elasticsearch } = plugins;
  const jobsQuery = jobsQueryFactory(config, elasticsearch);

  // list jobs in the queue, paginated
  router.get(
    {
      path: `${MAIN_ENTRY}/list`,
      validate: false,
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const request = makeRequestFacade(context, req, basePath);
      const {
        management: { jobTypes = [] },
      } = reporting.getLicenseInfo();
      const { username } = getUser(request.getRawRequest());
      const { page: queryPage, size: querySize, ids: queryIds } = request.query as ListQuery;
      const page = parseInt(queryPage, 10) || 0;
      const size = Math.min(100, parseInt(querySize, 10) || 10);
      const jobIds = queryIds ? queryIds.split(',') : null;
      const results = await jobsQuery.list(jobTypes, username, page, size, jobIds);

      return res.ok({
        body: results,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // return the count of all jobs in the queue
  router.get(
    {
      path: `${MAIN_ENTRY}/count`,
      validate: false,
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const request = makeRequestFacade(context, req, basePath);
      const { username } = getUser(request.getRawRequest());
      const {
        management: { jobTypes = [] },
      } = reporting.getLicenseInfo();

      const count = await jobsQuery.count(jobTypes, username);

      return res.ok({
        body: count.toString(),
        headers: {
          'content-type': 'text/plain',
        },
      });
    })
  );

  // return the raw output from a job
  router.get(
    {
      path: `${MAIN_ENTRY}/output/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 2 }),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const request = makeRequestFacade(context, req, basePath);
      const { username } = getUser(request.getRawRequest());
      const { docId } = req.params;
      const {
        management: { jobTypes = [] },
      } = reporting.getLicenseInfo();

      const result = await jobsQuery.get(username, docId, { includeContent: true });

      if (!result) {
        throw Boom.notFound();
      }

      const {
        _source: { jobtype: jobType, output: jobOutput },
      } = result;

      if (!jobTypes.includes(jobType)) {
        throw Boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`);
      }

      return res.ok({
        body: jobOutput,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // return some info about the job
  router.get(
    {
      path: `${MAIN_ENTRY}/info/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 2 }),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const request = makeRequestFacade(context, req, basePath);
      const { username } = getUser(request.getRawRequest());
      const { docId } = req.params;
      const {
        management: { jobTypes = [] },
      } = reporting.getLicenseInfo();

      const result = await jobsQuery.get(username, docId);

      if (!result) {
        throw Boom.notFound();
      }

      const { _source: job } = result;
      const { jobtype: jobType, payload: jobPayload } = job;

      if (!jobTypes.includes(jobType)) {
        throw Boom.unauthorized(`Sorry, you are not authorized to view ${jobType} info`);
      }

      return res.ok({
        body: {
          ...job,
          payload: {
            ...jobPayload,
            headers: undefined,
          },
        },
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // trigger a download of the output from a job
  const exportTypesRegistry = reporting.getExportTypesRegistry();
  const downloadResponseHandler = downloadJobResponseHandlerFactory(
    config,
    elasticsearch,
    exportTypesRegistry
  );

  router.get(
    {
      path: `${MAIN_ENTRY}/download/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 3 }),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { username } = getUser(req);
      const { docId } = req.params;
      const {
        management: { jobTypes = [] },
      } = reporting.getLicenseInfo();

      const response = await downloadResponseHandler(jobTypes, username, { docId });

      return res.custom({
        body:
          typeof response.content === 'string' ? Buffer.from(response.content) : response.content,
        statusCode: response.statusCode,
        headers: {
          ...response.headers,
          'content-type': response.contentType,
        },
      });
    })
  );

  // allow a report to be deleted
  const deleteResponseHandler = deleteJobResponseHandlerFactory(config, elasticsearch);
  router.delete(
    {
      path: `${MAIN_ENTRY}/delete/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 3 }),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { username } = getUser(req);
      const { docId } = req.params;
      const {
        management: { jobTypes = [] },
      } = reporting.getLicenseInfo();

      const response = await deleteResponseHandler(jobTypes, username, { docId });

      return res.ok({
        body: response,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );
}
