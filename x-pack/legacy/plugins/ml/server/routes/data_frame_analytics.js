/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { analyticsAuditMessagesProvider } from '../models/data_frame_analytics/analytics_audit_messages';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { dataAnalyticsJobConfigSchema } from '../new_platform/data_analytics_schema';

export function dataFrameAnalyticsRoutes({ xpackMainPlugin, router }) {
  async function dfAnalyticsGetAllHandler(context, request, response) {
    try {
      const results = await context.ml.mlClient.callAsCurrentUser('ml.getDataFrameAnalytics');
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.get(
    {
      path: '/api/ml/data_frame/analytics',
      validate: {
        params: schema.object({ analyticsId: schema.maybe(schema.string()) }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsGetAllHandler)
  );

  async function dfAnalyticsGetSingleJobHandler(context, request, response) {
    try {
      const { analyticsId } = request.params;
      const results = await context.ml.mlClient.callAsCurrentUser('ml.getDataFrameAnalytics', {
        analyticsId,
      });
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: schema.object({ analyticsId: schema.string() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsGetSingleJobHandler)
  );

  async function dfAnalyticsGetAllStatsHandler(context, request, response) {
    try {
      const results = await context.ml.mlClient.callAsCurrentUser('ml.getDataFrameAnalyticsStats');
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.get(
    {
      path: '/api/ml/data_frame/analytics/_stats',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsGetAllStatsHandler)
  );

  async function dfAnalyticsGetSingleJobStatsHandler(context, request, response) {
    try {
      const { analyticsId } = request.params;
      const results = await context.ml.mlClient.callAsCurrentUser('ml.getDataFrameAnalyticsStats', {
        analyticsId,
      });
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_stats',
      validate: {
        params: schema.object({ analyticsId: schema.string() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsGetSingleJobStatsHandler)
  );

  async function dfAnalyticsCreateJobHandler(context, request, response) {
    try {
      const { analyticsId } = request.params;
      const results = await context.ml.mlClient.callAsCurrentUser('ml.createDataFrameAnalytics', {
        body: request.body,
        analyticsId,
      });
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.put(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: schema.object({
          analyticsId: schema.string(),
        }),
        body: schema.object({ ...dataAnalyticsJobConfigSchema }, { allowUnknowns: true }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsCreateJobHandler)
  );

  async function dfAnalyticsEvaluateHandler(context, request, response) {
    try {
      const results = await context.ml.mlClient.callAsCurrentUser('ml.evaluateDataFrameAnalytics', {
        body: request.body,
      });
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.post(
    {
      path: '/api/ml/data_frame/_evaluate',
      validate: {
        body: schema.object({}, { allowUnknowns: true }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsEvaluateHandler)
  );

  async function dfAnalyticsExplainHandler(context, request, response) {
    try {
      const results = await context.ml.mlClient.callAsCurrentUser(
        'ml.estimateDataFrameAnalyticsMemoryUsage',
        {
          body: request.body,
        }
      );
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.post(
    {
      path: '/api/ml/data_frame/analytics/_explain',
      validate: {
        body: schema.object({}, { allowUnknowns: true }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsExplainHandler)
  );

  async function dfAnalyticsDeleteJobHandler(context, request, response) {
    try {
      const { analyticsId } = request.params;
      const results = await context.ml.mlClient.callAsCurrentUser('ml.deleteDataFrameAnalytics', {
        analyticsId,
      });
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.delete(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}',
      validate: {
        params: schema.object({
          analyticsId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsDeleteJobHandler)
  );

  async function dfAnalyticsStartJobHandler(context, request, response) {
    try {
      const { analyticsId } = request.params;
      const results = await context.ml.mlClient.callAsCurrentUser('ml.startDataFrameAnalytics', {
        analyticsId,
      });
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.post(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/_start',
      validate: {
        params: schema.object({
          analyticsId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsStartJobHandler)
  );

  async function dfAnalyticsStopJobHandler(context, request, response) {
    try {
      const options = {
        analyticsId: request.params.analyticsId,
      };

      if (request.url?.query?.force !== undefined) {
        options.force = request.url.query.force;
      }

      const results = await context.ml.mlClient.callAsCurrentUser(
        'ml.stopDataFrameAnalytics',
        options
      );
      return response.ok({
        body: { ...results },
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

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
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsStopJobHandler)
  );

  async function dfAnalyticsGetMessagesHandler(context, request, response) {
    try {
      const { analyticsId } = request.params;
      const { getAnalyticsAuditMessages } = analyticsAuditMessagesProvider(
        context.ml.mlClient.callAsCurrentUser
      );

      const results = await getAnalyticsAuditMessages(analyticsId);
      return response.ok({
        body: results,
      });
    } catch (e) {
      // Case: default
      return response.internalError({ body: e });
    }
  }

  router.get(
    {
      path: '/api/ml/data_frame/analytics/{analyticsId}/messages',
      validate: {
        params: schema.object({ analyticsId: schema.string() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, dfAnalyticsGetMessagesHandler)
  );
}
