/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { wrapError as errorWrapper } from '../client/error_wrapper';
import { estimateBucketSpanFactory } from '../models/bucket_span_estimator';
import { calculateModelMemoryLimitProvider } from '../models/calculate_model_memory_limit';
import { validateJob, validateCardinality } from '../models/job_validation';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';

export function jobValidationRoutes({
  commonRouteConfig,
  config,
  elasticsearchPlugin,
  route,
  xpackMainPlugin,
  router,
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
          estimateBucketSpanFactory(
            callWithRequest,
            elasticsearchPlugin,
            xpackMainPlugin
          )(request.payload)
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

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/cardinality Validate cardinality
   * @apiName ValidateCardinality
   * @apiDescription Returns cardinality validation result.
   */
  router.post(
    {
      path: '/api/ml/validate/cardinality',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const result = await validateCardinality(context, request.body);
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(errorWrapper(e));
      }
    })
  );

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
