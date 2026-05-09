/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { isInferenceRequestError } from '@kbn/inference-common';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';
import { getConnectorById } from '../util/get_connector_by_id';

export function registerConnectorByIdRoute({
  coreSetup,
  router,
  logger,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
}) {
  router.get(
    {
      path: '/internal/inference/connectors/{connectorId}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    async (_context, request, response) => {
      try {
        const [coreStart, pluginsStart] = await coreSetup.getStartServices();
        const actions = pluginsStart.actions;
        const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
        const connector = await getConnectorById({
          connectorId: request.params.connectorId,
          actions,
          request,
          esClient,
          logger,
        });
        return response.ok({ body: { connector } });
      } catch (e) {
        if (isInferenceRequestError(e) && e.status === 404) {
          return response.notFound({
            body: { message: e.message },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'message' in e ? e.message : String(e) },
        });
      }
    }
  );
}
