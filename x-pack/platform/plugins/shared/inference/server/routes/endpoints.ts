/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';

export function registerEndpointsRoute({
  coreSetup,
  router,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
}) {
  router.get(
    {
      path: '/internal/inference/endpoints',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Elasticsearch client',
        },
      },
      validate: {
        query: schema.object({
          taskType: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const [, , inferenceStart] = await coreSetup.getStartServices();
        // I don't love this cast, but actually verifying against the type seems excessive
        // Especially because the type may lag the actual existing task types sometimes
        // and we don't want to break API calls that are valid but just not typed yet
        const taskType = request.query.taskType as InferenceTaskType | undefined;
        const endpoints = await inferenceStart.getInferenceEndpoints(taskType);
        return response.ok({ body: { endpoints } });
      } catch (e) {
        return response.customError({
          statusCode: 500,
          body: { message: 'message' in e ? e.message : String(e) },
        });
      }
    }
  );
}
