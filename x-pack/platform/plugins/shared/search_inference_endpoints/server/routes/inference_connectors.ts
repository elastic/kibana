/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { InferenceConnector } from '@kbn/inference-common';
import { APIRoutes } from '../../common/types';
import { ROUTE_VERSIONS } from '../../common/constants';
import type { ResolvedInferenceEndpoints } from '../types';
import { errorHandler } from '../utils/error_handler';
import { resolveModelsForFeature } from '../lib/resolve_models_for_feature';

export const defineInferenceConnectorsRoute = ({
  logger,
  router,
  getForFeature,
  getConnectorList,
  getConnectorById,
}: {
  logger: Logger;
  router: IRouter;
  getForFeature: (featureId: string, request: KibanaRequest) => Promise<ResolvedInferenceEndpoints>;
  getConnectorList: (request: KibanaRequest) => Promise<InferenceConnector[]>;
  getConnectorById: (id: string, request: KibanaRequest) => Promise<InferenceConnector>;
}) => {
  router.versioned
    .get({
      access: 'internal',
      path: APIRoutes.GET_INFERENCE_CONNECTORS,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            enabled: false,
            reason: 'This route delegates authorization to the scoped ES client',
          },
        },
        validate: {
          request: {
            query: schema.object({
              featureId: schema.string({ maxLength: 255 }),
            }),
          },
        },
        version: ROUTE_VERSIONS.v1,
      },
      errorHandler(logger)(async (context, request, response) => {
        const { featureId } = request.query;
        const uiSettingsClient = (await context.core).uiSettings.client;

        const result = await resolveModelsForFeature({
          getForFeature: (fId) => getForFeature(fId, request),
          getConnectorList: () => getConnectorList(request),
          getConnectorById: (id) => getConnectorById(id, request),
          uiSettingsClient,
          featureId,
          logger,
        });

        return response.ok({
          body: {
            connectors: result.connectors,
            soEntryFound: result.soEntryFound,
          },
        });
      })
    );
};
