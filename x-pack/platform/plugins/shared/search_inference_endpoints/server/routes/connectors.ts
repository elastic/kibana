/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { APIRoutes } from '../types';
import { errorHandler } from '../utils/error_handler';

export function defineConnectorRoutes({
  logger,
  router,
  getInferenceStart,
}: {
  logger: Logger;
  router: IRouter;
  getInferenceStart: () => InferenceServerStart | undefined;
}) {
  router.get(
    {
      path: APIRoutes.GET_CONNECTORS,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the inference plugin',
        },
      },
      validate: {},
    },
    errorHandler(logger)(async (_context, request, response) => {
      const inferenceStart = getInferenceStart();
      if (!inferenceStart) {
        return response.custom({ statusCode: 503, body: 'Inference plugin not available' });
      }

      const connectors = await inferenceStart.getConnectorList(request);
      return response.ok({ body: connectors });
    })
  );

  router.get(
    {
      path: APIRoutes.GET_CONNECTOR_BY_ID,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the inference plugin',
        },
      },
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    errorHandler(logger)(async (_context, request, response) => {
      const inferenceStart = getInferenceStart();
      if (!inferenceStart) {
        return response.custom({ statusCode: 503, body: 'Inference plugin not available' });
      }

      const connector = await inferenceStart.getConnectorById(request.params.connectorId, request);
      return response.ok({ body: connector });
    })
  );
}
