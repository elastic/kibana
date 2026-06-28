/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { APIRoutes } from '../../common/types';
import { ROUTE_VERSIONS } from '../../common/constants';
import type { ResolvedInferenceEndpoints } from '../types';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
import { errorHandler } from '../utils/error_handler';
<<<<<<< HEAD
import { resolveModelsForFeature } from '../lib/resolve_models_for_feature';
=======
import { mergeConnectors, type ApiInferenceConnector } from '../lib/merge_connectors';
>>>>>>> 9.4

export const defineInferenceConnectorsRoute = ({
  logger,
  router,
  featureRegistry,
  getForFeature,
  getConnectorList,
  getConnectorById,
}: {
  logger: Logger;
  router: IRouter;
  featureRegistry: InferenceFeatureRegistry;
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
<<<<<<< HEAD
        const feature = featureRegistry.get(featureId);
=======
        const [defaultConnectorId, defaultConnectorOnly] = await Promise.all([
          uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR),
          uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY),
        ]);

        const fetchConnectorById = async (id: string): Promise<InferenceConnector | undefined> => {
          try {
            return await getConnectorById(id, request);
          } catch (e) {
            logger.warn(`Failed to load default connector "${id}": ${e.message}`);
            return undefined;
          }
        };

        if (defaultConnectorOnly) {
          if (!defaultConnectorId || defaultConnectorId === 'NO_DEFAULT_CONNECTOR') {
            return response.ok({ body: { connectors: [], soEntryFound: false } });
          }
          const connector = await fetchConnectorById(defaultConnectorId);
          return response.ok({
            body: {
              connectors: connector ? [connector] : [],
              soEntryFound: false,
            },
          });
        }
>>>>>>> 9.4

        const result = await resolveModelsForFeature({
          getForFeature: (fId) => getForFeature(fId, request),
          getConnectorList: () => getConnectorList(request),
          getConnectorById: (id) => getConnectorById(id, request),
          uiSettingsClient,
          featureId,
          ignoreGlobalDefault: feature?.ignoreGlobalDefault ?? false,
          logger,
        });

        const { soEntryFound } = featureResult;
        const merged = mergeConnectors(featureResult.endpoints, allConnectors, soEntryFound);

        let connectors: ApiInferenceConnector[] = merged;
        if (!soEntryFound && defaultConnectorId && defaultConnectorId !== 'NO_DEFAULT_CONNECTOR') {
          const defaultConnector = await fetchConnectorById(defaultConnectorId);
          if (defaultConnector) {
            connectors = [
              defaultConnector,
              ...merged.filter((c) => c.connectorId !== defaultConnectorId),
            ];
          }
        }

        return response.ok({
          body: {
<<<<<<< HEAD
            connectors: result.connectors,
            soEntryFound: result.soEntryFound,
=======
            connectors,
            soEntryFound,
>>>>>>> 9.4
          },
        });
      })
    );
};
