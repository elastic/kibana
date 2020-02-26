/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from '../client/error_wrapper';
import { analyticsAuditMessagesProvider } from '../models/data_frame_analytics/analytics_audit_messages';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { RouteInitialization } from '../new_platform/plugin';
import {
  dataAnalyticsJobConfigSchema,
  dataAnalyticsEvaluateSchema,
  dataAnalyticsExplainSchema,
} from '../new_platform/data_analytics_schema';

/**
 * Routes for the data frame analytics
 */
export function dataFrameAnalyticsRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics Get analytics data
   * @apiName GetDataFrameAnalytics
   * @apiDescription Returns the list of data frame analytics jobs.
   *
   * @apiSuccess {Number} count
   * @apiSuccess {Object[]} data_frame_analytics
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics',
      validate: {
        params: schema.object({ analyticsId: schema.maybe(schema.string()) }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.getDataFrameAnalytics');
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/:analyticsId Get analytics data by id
   * @apiName GetDataFrameAnalyticsById
   * @apiDescription Returns the data frame analytics job.
   *
   * @apiParam {String} analyticsId Analytics ID.
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: schema.object({ analyticsId: schema.string() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.getDataFrameAnalytics', {
          analyticsId,
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
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/_stats Get analytics stats
   * @apiName GetDataFrameAnalyticsStats
   * @apiDescription Returns data frame analytics jobs statistics.
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/_stats',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.getDataFrameAnalyticsStats'
        );
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/:analyticsId/_stats Get stats for requested analytics job
   * @apiName GetDataFrameAnalyticsStatsById
   * @apiDescription Returns data frame analytics job statistics.
   *
   * @apiParam {String} analyticsId Analytics ID.
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_stats',
      validate: {
        params: schema.object({ analyticsId: schema.string() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.getDataFrameAnalyticsStats',
          {
            analyticsId,
          }
        );
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {put} /api/ml/data_frame/analytics/:analyticsId Instantiate a data frame analytics job
   * @apiName UpdateDataFrameAnalytics
   * @apiDescription This API creates a data frame analytics job that performs an analysis
   *                 on the source index and stores the outcome in a destination index.
   *
   * @apiParam {String} analyticsId Analytics ID.
   */
  router.put(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: schema.object({
          analyticsId: schema.string(),
        }),
        body: schema.object(dataAnalyticsJobConfigSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.createDataFrameAnalytics',
          {
            body: request.body,
            analyticsId,
          }
        );
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/_evaluate Evaluate the data frame analytics for an annotated index
   * @apiName EvaluateDataFrameAnalytics
   * @apiDescription Evaluates the data frame analytics for an annotated index.
   */
  router.post(
    {
      path: '/api/ml/data_frame/_evaluate',
      validate: {
        body: schema.object({ ...dataAnalyticsEvaluateSchema }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.evaluateDataFrameAnalytics',
          {
            body: request.body,
          }
        );
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/_explain Explain a data frame analytics config
   * @apiName ExplainDataFrameAnalytics
   * @apiDescription This API provides explanations for a data frame analytics config
   *                 that either exists already or one that has not been created yet.
   *
   * @apiParam {String} [description]
   * @apiParam {Object} [dest]
   * @apiParam {Object} source
   * @apiParam {String} source.index
   * @apiParam {Object} analysis
   * @apiParam {Object} [analyzed_fields]
   * @apiParam {String} [model_memory_limit]
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/_explain',
      validate: {
        body: schema.object({ ...dataAnalyticsExplainSchema }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.explainDataFrameAnalytics',
          {
            body: request.body,
          }
        );
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {delete} /api/ml/data_frame/analytics/:analyticsId Delete specified analytics job
   * @apiName DeleteDataFrameAnalytics
   * @apiDescription Deletes specified data frame analytics job.
   *
   * @apiParam {String} analyticsId Analytics ID.
   */
  router.delete(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: schema.object({
          analyticsId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.deleteDataFrameAnalytics',
          {
            analyticsId,
          }
        );
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/analytics/:analyticsId/_start Start specified analytics job
   * @apiName StartDataFrameAnalyticsJob
   * @apiDescription Starts a data frame analytics job.
   *
   * @apiParam {String} analyticsId Analytics ID.
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_start',
      validate: {
        params: schema.object({
          analyticsId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.startDataFrameAnalytics', {
          analyticsId,
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
   * @apiGroup DataFrameAnalytics
   *
   * @api {post} /api/ml/data_frame/analytics/:analyticsId/_stop Stop specified analytics job
   * @apiName StopsDataFrameAnalyticsJob
   * @apiDescription Stops a data frame analytics job.
   *
   * @apiParam {String} analyticsId Analytics ID.
   */
  router.post(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_stop',
      validate: {
        params: schema.object({
          analyticsId: schema.string(),
          force: schema.maybe(schema.boolean()),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const options: { analyticsId: string; force?: boolean | undefined } = {
          analyticsId: request.params.analyticsId,
        };
        // @ts-ignore TODO: update types
        if (request.url?.query?.force !== undefined) {
          // @ts-ignore TODO: update types
          options.force = request.url.query.force;
        }

        const results = await context.ml!.mlClient.callAsCurrentUser(
          'ml.stopDataFrameAnalytics',
          options
        );
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup DataFrameAnalytics
   *
   * @api {get} /api/ml/data_frame/analytics/:analyticsId/messages Get analytics job messages
   * @apiName GetDataFrameAnalyticsMessages
   * @apiDescription Returns the list of audit messages for data frame analytics jobs.
   *
   * @apiParam {String} analyticsId Analytics ID.
   */
  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/messages',
      validate: {
        params: schema.object({ analyticsId: schema.string() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { analyticsId } = request.params;
        const { getAnalyticsAuditMessages } = analyticsAuditMessagesProvider(
          context.ml!.mlClient.callAsCurrentUser
        );

        const results = await getAnalyticsAuditMessages(analyticsId);
        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
