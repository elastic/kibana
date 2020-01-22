/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsError } from '../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../common';
import { RouteDependencies, ServerShim } from '../../types';

export function registerJobsRoute(deps: RouteDependencies, legacy: ServerShim) {
  const getJobsHandler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);

    try {
      const data = await callWithRequest('rollup.jobs');
      return response.ok({ body: data });
    } catch (err) {
      if (isEsError(err)) {
        return response.customError({ statusCode: err.statusCode, body: err });
      }
      return response.internalError({ body: err });
    }
  };

  const createJobsHandler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    try {
      const { id, ...rest } = request.body.job;
      const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
      // Create job.
      await callWithRequest('rollup.createJob', {
        id,
        body: rest,
      });
      // Then request the newly created job.
      const results = await callWithRequest('rollup.job', { id });
      return response.ok({ body: results.jobs[0] });
    } catch (err) {
      if (isEsError(err)) {
        return response.customError({ statusCode: err.statusCode, body: err });
      }
      return response.internalError({ body: err });
    }
  };

  const startJobsHandler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    try {
      const { jobIds } = request.body;
      const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);

      const data = await Promise.all(
        jobIds.map((id: string) => callWithRequest('rollup.startJob', { id }))
      ).then(() => ({ success: true }));
      return response.ok({ body: data });
    } catch (err) {
      if (isEsError(err)) {
        return response.customError({ statusCode: err.statusCode, body: err });
      }
      return response.internalError({ body: err });
    }
  };

  const stopJobsHandler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    try {
      const { jobIds } = request.body;
      // For our API integration tests we need to wait for the jobs to be stopped
      // in order to be able to delete them sequencially.
      const { waitForCompletion } = request.query;
      const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
      const stopRollupJob = (id: string) =>
        callWithRequest('rollup.stopJob', {
          id,
          waitForCompletion: waitForCompletion === 'true',
        });
      const data = await Promise.all(jobIds.map(stopRollupJob)).then(() => ({ success: true }));
      return response.ok({ body: data });
    } catch (err) {
      if (isEsError(err)) {
        return response.customError({ statusCode: err.statusCode, body: err });
      }
      return response.internalError({ body: err });
    }
  };

  const deleteJobsHandler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    try {
      const { jobIds } = request.body;
      const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
      const data = await Promise.all(
        jobIds.map((id: string) => callWithRequest('rollup.deleteJob', { id }))
      ).then(() => ({ success: true }));
      return response.ok({ body: data });
    } catch (err) {
      // There is an issue opened on ES to handle the following error correctly
      // https://github.com/elastic/elasticsearch/issues/42908
      // Until then we'll modify the response here.
      if (err.response && err.response.includes('Job must be [STOPPED] before deletion')) {
        err.status = 400;
        err.statusCode = 400;
        err.displayName = 'Bad request';
        err.message = JSON.parse(err.response).task_failures[0].reason.reason;
      }
      if (isEsError(err)) {
        return response.customError({ statusCode: err.statusCode, body: err });
      }
      return response.internalError({ body: err });
    }
  };

  deps.router.get(
    {
      path: `${API_BASE_PATH}/jobs`,
      validate: false,
    },
    licensePreRoutingFactory(legacy, getJobsHandler)
  );

  deps.router.put(
    {
      path: `${API_BASE_PATH}/create`,
      validate: {
        body: schema.object({
          job: schema.object(
            {
              id: schema.string(),
            },
            { allowUnknowns: true }
          ),
        }),
      },
    },
    licensePreRoutingFactory(legacy, createJobsHandler)
  );

  deps.router.post(
    {
      path: `${API_BASE_PATH}/start`,
      validate: {
        body: schema.object({
          jobIds: schema.arrayOf(schema.string()),
        }),
        query: schema.maybe(
          schema.object({
            waitForCompletion: schema.maybe(schema.string()),
          })
        ),
      },
    },
    licensePreRoutingFactory(legacy, startJobsHandler)
  );

  deps.router.post(
    {
      path: `${API_BASE_PATH}/stop`,
      validate: {
        body: schema.object({
          jobIds: schema.arrayOf(schema.string()),
        }),
      },
    },
    licensePreRoutingFactory(legacy, stopJobsHandler)
  );

  deps.router.post(
    {
      path: `${API_BASE_PATH}/delete`,
      validate: {
        body: schema.object({
          jobIds: schema.arrayOf(schema.string()),
        }),
      },
    },
    licensePreRoutingFactory(legacy, deleteJobsHandler)
  );
}
