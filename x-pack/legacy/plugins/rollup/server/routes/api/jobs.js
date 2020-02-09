/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';

export function registerJobsRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/rollup/jobs',
    method: 'GET',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      try {
        const callWithRequest = callWithRequestFactory(server, request);
        return await callWithRequest('rollup.jobs');
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });

  server.route({
    path: '/api/rollup/create',
    method: 'PUT',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      try {
        const { id, ...rest } = request.payload.job;

        const callWithRequest = callWithRequestFactory(server, request);

        // Create job.
        await callWithRequest('rollup.createJob', {
          id,
          body: rest,
        });

        // Then request the newly created job.
        const results = await callWithRequest('rollup.job', { id });
        return results.jobs[0];
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });

  server.route({
    path: '/api/rollup/start',
    method: 'POST',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      try {
        const { jobIds } = request.payload;

        const callWithRequest = callWithRequestFactory(server, request);
        return await Promise.all(
          jobIds.map(id => callWithRequest('rollup.startJob', { id }))
        ).then(() => ({ success: true }));
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });

  server.route({
    path: '/api/rollup/stop',
    method: 'POST',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      try {
        const { jobIds } = request.payload;
        // For our API integration tests we need to wait for the jobs to be stopped
        // in order to be able to delete them sequencially.
        const { waitForCompletion } = request.query;
        const callWithRequest = callWithRequestFactory(server, request);

        const stopRollupJob = id =>
          callWithRequest('rollup.stopJob', {
            id,
            waitForCompletion: waitForCompletion === 'true',
          });

        return await Promise.all(jobIds.map(stopRollupJob)).then(() => ({ success: true }));
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });

  server.route({
    path: '/api/rollup/delete',
    method: 'POST',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      try {
        const { jobIds } = request.payload;

        const callWithRequest = callWithRequestFactory(server, request);
        return await Promise.all(
          jobIds.map(id => callWithRequest('rollup.deleteJob', { id }))
        ).then(() => ({ success: true }));
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
          throw wrapEsError(err);
        }

        throw wrapUnknownError(err);
      }
    },
  });
}
