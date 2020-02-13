/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { RequestHandlerContext } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../new_platform/plugin';
import { estimateBucketSpanSchema } from '../new_platform/job_validation_schema';
import { estimateBucketSpanFactory } from '../models/bucket_span_estimator';
import { calculateModelMemoryLimitProvider } from '../models/calculate_model_memory_limit';
import { validateJob, validateCardinality } from '../models/job_validation';

/**
 * Routes for job validation
 */
export function jobValidationRoutes({ config, xpackMainPlugin, router }: RouteInitialization) {
  function calculateModelMemoryLimit(context: RequestHandlerContext, payload: any) {
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

    return calculateModelMemoryLimitProvider(context.ml!.mlClient.callAsCurrentUser)(
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

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/estimate_bucket_span
   * @apiName EstimateBucketSpan
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/validate/estimate_bucket_span',
      validate: {
        body: schema.object(estimateBucketSpanSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        let errorResp;

        const resp = await estimateBucketSpanFactory(
          context.ml!.mlClient.callAsCurrentUser,
          context.core.elasticsearch.adminClient.callAsInternalUser,
          xpackMainPlugin
        )(request.body)
          // this catch gets triggered when the estimation code runs without error
          // but isn't able to come up with a bucket span estimation.
          // this doesn't return a HTTP error but an object with an error message
          // which the client is then handling. triggering a HTTP error would be
          // too severe for this case.
          .catch((error: any) => {
            errorResp = {
              error: true,
              message: error,
            };
          });

        return response.ok({
          body: errorResp !== undefined ? errorResp : resp,
        });
      } catch (e) {
        // this catch gets triggered when an actual error gets thrown when running
        // the estimation code, for example when the request payload is malformed
        // const error = Boom.badRequest(e);
        // return response.customError(wrapError(error));
        throw Boom.badRequest(e);
      }
    })
  );

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/calculate_model_memory_limit
   * @apiName CalculateModelMemoryLimit
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/validate/calculate_model_memory_limit',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await calculateModelMemoryLimit(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/cardinality
   * @apiName ValidateCardinality
   * @apiDescription
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
        const resp = await validateCardinality(
          context.ml!.mlClient.callAsCurrentUser,
          request.body
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobValidation
   *
   * @api {post} /api/ml/validate/job
   * @apiName ValidateJob
   * @apiDescription
   */
  router.post(
    {
      path: '/api/ml/validate/job',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        // pkg.branch corresponds to the version used in documentation links.
        const version = config.get('pkg.branch');
        const resp = await validateJob(
          context.ml!.mlClient.callAsCurrentUser,
          request.body,
          version,
          context.core.elasticsearch.adminClient.callAsInternalUser,
          xpackMainPlugin
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
