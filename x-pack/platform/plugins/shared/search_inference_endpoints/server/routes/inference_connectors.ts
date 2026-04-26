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
import { errorHandler } from '../utils/error_handler';
import { mergeConnectors, type ApiInferenceConnector } from '../lib/merge_connectors';

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

        const [featureResult, allConnectors] = await Promise.all([
          getForFeature(featureId, request).catch((e): ResolvedInferenceEndpoints => {
            logger.error(`Failed to resolve endpoints for feature "${featureId}": ${e.message}`);
            return { endpoints: [], warnings: [], soEntryFound: false };
          }),
          getConnectorList(request).catch((e): InferenceConnector[] => {
            logger.error(`Failed to load connector list: ${e.message}`);
            return [];
          }),
        ]);

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
            connectors,
            soEntryFound,
          },
        });
      })
    );
};
