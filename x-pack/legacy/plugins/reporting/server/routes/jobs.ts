/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { IRouter, IBasePath } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { API_BASE_URL } from '../../common/constants';
import { ListQuery, Logger } from '../../types';
import { jobsQueryFactory } from '../lib/jobs_query';
import { ReportingCore, ReportingSetupDeps } from '../types';
import {
  deleteJobResponseHandlerFactory,
  downloadJobResponseHandlerFactory,
} from './lib/job_response_handler';
import { makeRequestFacade } from './lib/make_request_facade';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';

const MAIN_ENTRY = `${API_BASE_URL}/jobs`;

export function registerJobInfoRoutes(
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
      validate: {},
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const request = makeRequestFacade(context, req, basePath);
      const { username } = getUser(request.getRawRequest());
      const { page: queryPage, size: querySize, ids: queryIds } = request.query as ListQuery;
      const page = parseInt(queryPage, 10) || 0;
      const size = Math.min(100, parseInt(querySize, 10) || 10);
      const jobIds = queryIds ? queryIds.split(',') : null;

      // @todo: fill in jobtypes from license checks
      const results = await jobsQuery.list([], username, page, size, jobIds);

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
      validate: {},
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const request = makeRequestFacade(context, req, basePath);
      const { username } = getUser(request.getRawRequest());

      // @todo: fill in jobtypes from license checks
      const results = await jobsQuery.count([], username);

      return res.ok({
        body: { count: results },
        headers: {
          'content-type': 'application/json',
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

      const result = await jobsQuery.get(username, docId, { includeContent: true });

      if (!result) {
        throw Boom.notFound();
      }

      const {
        _source: { jobtype: jobType, output: jobOutput },
      } = result;

      if (!['@todo'].includes(jobType)) {
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

      const result = await jobsQuery.get(username, docId);

      if (!result) {
        throw Boom.notFound();
      }

      const { _source: job } = result;
      const { jobtype: jobType, payload: jobPayload } = job;

      if (!['@todo'].includes(jobType)) {
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

      // @TODD: JobTypes checks
      const response = await downloadResponseHandler([], username, { docId });

      return res.ok({
        body: response.content,
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

      // @TODD Jobtypes here.
      const response = await deleteResponseHandler([], username, { docId });

      return res.ok({
        body: response,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );
}
