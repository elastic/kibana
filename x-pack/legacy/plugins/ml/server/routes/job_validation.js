/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { estimateBucketSpanFactory } from '../models/bucket_span_estimator';
import { calculateModelMemoryLimitProvider } from '../models/calculate_model_memory_limit';
import { validateJob, validateCardinality } from '../models/job_validation';

export function jobValidationRoutes({
  commonRouteConfig,
  config,
  elasticsearchPlugin,
  route,
  xpackMainPlugin,
}) {
  function calculateModelMemoryLimit(callWithRequest, payload) {
    const {
      indexPattern,
      splitFieldName,
      query,
      fieldNames,
      influencerNames,
      timeFieldName,
      earliestMs,
      latestMs,
    } = payload;

    return calculateModelMemoryLimitProvider(callWithRequest)(
      indexPattern,
      splitFieldName,
      query,
      fieldNames,
      influencerNames,
      timeFieldName,
      earliestMs,
      latestMs
    );
  }

  route({
    method: 'POST',
    path: '/api/ml/validate/estimate_bucket_span',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      try {
        return (
          estimateBucketSpanFactory(callWithRequest, elasticsearchPlugin, xpackMainPlugin)(
            request.payload
          )
            // this catch gets triggered when the estimation code runs without error
            // but isn't able to come up with a bucket span estimation.
            // this doesn't return a HTTP error but an object with an error message
            // which the client is then handling. triggering a HTTP error would be
            // too severe for this case.
            .catch(resp => ({
              error: true,
              message: resp,
            }))
        );
        // this catch gets triggered when an actual error gets thrown when running
        // the estimation code, for example when the request payload is malformed
      } catch (error) {
        throw Boom.badRequest(error);
      }
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/validate/calculate_model_memory_limit',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return calculateModelMemoryLimit(callWithRequest, request.payload).catch(resp =>
        wrapError(resp)
      );
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/validate/cardinality',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return validateCardinality(callWithRequest, request.payload)
        .then(reply)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/validate/job',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      // pkg.branch corresponds to the version used in documentation links.
      const version = config.get('pkg.branch');
      return validateJob(
        callWithRequest,
        request.payload,
        version,
        elasticsearchPlugin,
        xpackMainPlugin
      ).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
