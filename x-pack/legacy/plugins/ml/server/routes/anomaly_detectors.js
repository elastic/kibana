/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';

export function jobRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'GET',
    path: '/api/ml/anomaly_detectors',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.jobs').catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/anomaly_detectors/{jobId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const jobId = request.params.jobId;
      return callWithRequest('ml.jobs', { jobId }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/anomaly_detectors/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.jobStats').catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/anomaly_detectors/{jobId}/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const jobId = request.params.jobId;
      return callWithRequest('ml.jobStats', { jobId }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'PUT',
    path: '/api/ml/anomaly_detectors/{jobId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const jobId = request.params.jobId;
      const body = request.payload;
      return callWithRequest('ml.addJob', { jobId, body }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/anomaly_detectors/{jobId}/_update',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const jobId = request.params.jobId;
      const body = request.payload;
      return callWithRequest('ml.updateJob', { jobId, body }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/anomaly_detectors/{jobId}/_open',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const jobId = request.params.jobId;
      return callWithRequest('ml.openJob', { jobId }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/anomaly_detectors/{jobId}/_close',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const options = {
        jobId: request.params.jobId,
      };
      const force = request.query.force;
      if (force !== undefined) {
        options.force = force;
      }
      return callWithRequest('ml.closeJob', options).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'DELETE',
    path: '/api/ml/anomaly_detectors/{jobId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const options = {
        jobId: request.params.jobId,
      };
      const force = request.query.force;
      if (force !== undefined) {
        options.force = force;
      }
      return callWithRequest('ml.deleteJob', options).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/anomaly_detectors/_validate/detector',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const body = request.payload;
      return callWithRequest('ml.validateDetector', { body }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/anomaly_detectors/{jobId}/_forecast',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const jobId = request.params.jobId;
      const duration = request.payload.duration;
      return callWithRequest('ml.forecast', { jobId, duration }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/anomaly_detectors/{jobId}/results/overall_buckets',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.overallBuckets', {
        jobId: request.params.jobId,
        top_n: request.payload.topN,
        bucket_span: request.payload.bucketSpan,
        start: request.payload.start,
        end: request.payload.end,
      }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
