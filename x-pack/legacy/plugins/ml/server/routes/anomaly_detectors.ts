/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from '../client/error_wrapper';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { RouteInitialization } from '../new_platform/plugin';
import {
  anomalyDetectionJobSchema,
  anomalyDetectionUpdateJobSchema,
} from '../new_platform/anomaly_detectors_schema';

/**
 * Routes for the anomaly detectors
 */
export function jobRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors Get anomaly detectors data
   * @apiName GetAnomalyDetectors
   * @apiDescription Returns the list of anomaly detection jobs.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} jobs
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.jobs');
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/:jobId Get anomaly detection data by id
   * @apiName GetAnomalyDetectorsById
   * @apiDescription Returns the anomaly detection job.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/{jobId}',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.jobs', { jobId });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/_stats Get anomaly detection stats
   * @apiName GetAnomalyDetectorsStats
   * @apiDescription Returns anomaly detection jobs statistics.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} jobs
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/_stats',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.jobStats');
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/:jobId/_stats Get stats for requested anomaly detection job
   * @apiName GetAnomalyDetectorsStatsById
   * @apiDescription Returns anomaly detection job statistics.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_stats',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.jobStats', { jobId });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {put} /api/ml/anomaly_detectors/:jobId Instantiate an anomaly detection job
   * @apiName CreateAnomalyDetectors
   * @apiDescription Creates an anomaly detection job.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.put(
    {
      path: '/api/ml/anomaly_detectors/{jobId}',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
        body: schema.object({ ...anomalyDetectionJobSchema }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.addJob', {
          jobId,
          body: request.body,
        });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_update Update an anomaly detection job
   * @apiName UpdateAnomalyDetectors
   * @apiDescription Updates certain properties of an anomaly detection job.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_update',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
        body: schema.object({ ...anomalyDetectionUpdateJobSchema }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.updateJob', {
          jobId,
          body: request.body,
        });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_open Open specified job
   * @apiName OpenAnomalyDetectorsJob
   * @apiDescription Opens an anomaly detection job.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_open',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { jobId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.openJob', {
          jobId,
        });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_close Close specified job
   * @apiName CloseAnomalyDetectorsJob
   * @apiDescription Closes an anomaly detection job.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_close',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const options: { jobId: string; force?: boolean } = {
          jobId: request.params.jobId,
        };
        const force = request.query.force;
        if (force !== undefined) {
          options.force = force;
        }
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.closeJob', options);
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {delete} /api/ml/anomaly_detectors/:jobId Delete specified job
   * @apiName DeleteAnomalyDetectorsJob
   * @apiDescription Deletes specified anomaly detection job.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.delete(
    {
      path: '/api/ml/anomaly_detectors/{jobId}',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const options: { jobId: string; force?: boolean } = {
          jobId: request.params.jobId,
        };
        const force = request.query.force;
        if (force !== undefined) {
          options.force = force;
        }
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.deleteJob', options);
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/_validate/detector Validate detector
   * @apiName ValidateAnomalyDetector
   * @apiDescription Validates specified detector.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/_validate/detector',
      validate: {
        body: schema.any(),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.validateDetector', {
          body: request.body,
        });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/_forecast Create forecast for specified job
   * @apiName ForecastAnomalyDetector
   * @apiDescription Creates a forecast for the specified anomaly detection job, predicting the future behavior of a time series by using its historical behavior.
   *
   * @apiParam {String} jobId Job ID.
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/_forecast',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
        body: schema.object({ duration: schema.any() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const jobId = request.params.jobId;
        const duration = request.body.duration;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.forecast', {
          jobId,
          duration,
        });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/results/buckets  Obtain bucket scores for the specified job ID
   * @apiName GetOverallBuckets
   * @apiDescription The get buckets API presents a chronological view of the records, grouped by bucket.
   *
   * @apiParam {String} jobId Job ID.
   * @apiParam {String} timestamp.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} buckets
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/results/buckets/{timestamp?}',
      validate: {
        params: schema.object({
          jobId: schema.string(),
          timestamp: schema.maybe(schema.string()),
        }),
        body: schema.object({
          anomaly_score: schema.maybe(schema.number()),
          desc: schema.maybe(schema.boolean()),
          end: schema.maybe(schema.string()),
          exclude_interim: schema.maybe(schema.boolean()),
          expand: schema.maybe(schema.boolean()),
          'page.from': schema.maybe(schema.number()),
          'page.size': schema.maybe(schema.number()),
          sort: schema.maybe(schema.string()),
          start: schema.maybe(schema.string()),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.buckets', {
          jobId: request.params.jobId,
          timestamp: request.params.timestamp,
          ...request.body,
        });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {post} /api/ml/anomaly_detectors/:jobId/results/overall_buckets  Obtain overall bucket scores for the specified job ID
   * @apiName GetOverallBuckets
   * @apiDescription Retrieves overall bucket results that summarize the bucket results of multiple anomaly detection jobs.
   *
   * @apiParam {String} jobId Job ID.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} overall_buckets
   */
  router.post(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/results/overall_buckets',
      validate: {
        params: schema.object({
          jobId: schema.string(),
        }),
        body: schema.object({
          topN: schema.number(),
          bucketSpan: schema.string(),
          start: schema.number(),
          end: schema.number(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.overallBuckets', {
          jobId: request.params.jobId,
          top_n: request.body.topN,
          bucket_span: request.body.bucketSpan,
          start: request.body.start,
          end: request.body.end,
        });
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup AnomalyDetectors
   *
   * @api {get} /api/ml/anomaly_detectors/:jobId/results/categories/:categoryId Get results category data by job id and category id
   * @apiName GetCategories
   * @apiDescription Returns the categories results for the specified job ID and category ID.
   *
   * @apiParam {String} jobId Job ID.
   * @apiParam {String} categoryId Category ID.
   */
  router.get(
    {
      path: '/api/ml/anomaly_detectors/{jobId}/results/categories/{categoryId}',
      validate: {
        params: schema.object({
          categoryId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const options = {
          jobId: request.params.jobId,
          categoryId: request.params.categoryId,
        };
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.categories', options);
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
