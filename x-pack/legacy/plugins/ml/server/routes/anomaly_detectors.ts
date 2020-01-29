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

export function jobRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  router.get(
    {
      path: '/api/ml/anomaly_detectors',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.jobs');
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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  router.get(
    {
      path: '/api/ml/anomaly_detectors/_stats',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const results = await context.ml!.mlClient.callAsCurrentUser('ml.jobStats');
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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

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
          body: { ...results },
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
