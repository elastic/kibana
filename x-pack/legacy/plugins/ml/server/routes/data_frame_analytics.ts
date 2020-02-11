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

export function dataFrameAnalyticsRoutes({ xpackMainPlugin, router }: RouteInitialization) {
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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
