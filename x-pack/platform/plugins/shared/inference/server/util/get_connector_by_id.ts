/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest, ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  createInferenceRequestError,
  InferenceConnectorType,
  type InferenceConnector,
} from '@kbn/inference-common';
import { getConnectorList } from './get_connector_list';

/**
 * Retrieves a connector or inference endpoint given the provided `connectorId`.
 *
 * If the `connectorId` matches a preconfigured `.inference` stack connector that has been
 * superseded by its underlying inference endpoint (i.e. `getConnectorList` prefers the
 * endpoint representation), the corresponding inference endpoint is returned instead.
 */
export const getConnectorById = async ({
  connectorId,
  actions,
  request,
  esClient,
  logger,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<InferenceConnector> => {
  const connectors = await getConnectorList({ actions, request, esClient, logger });
  const match = connectors.find((c) => c.connectorId === connectorId);

  if (match) {
    return match;
  }

  // The requested ID may belong to a stack `.inference` connector whose underlying inference
  // endpoint was already returned in the list under `inferenceId`. Look up the raw stack
  // connector to resolve the alias.
  const actionClient = await actions.getActionsClientWithRequest(request);
  const allStackConnectors = await actionClient.getAll({ includeSystemActions: false });
  const stackConnector = allStackConnectors.find((c) => c.id === connectorId);

  if (stackConnector?.actionTypeId === InferenceConnectorType.Inference) {
    const inferenceId = stackConnector.config?.inferenceId as string | undefined;
    if (inferenceId) {
      const endpointMatch = connectors.find((c) => c.connectorId === inferenceId);
      if (endpointMatch) {
        return endpointMatch;
      }
    }
  }

  throw createInferenceRequestError(
    `No connector or inference endpoint found for ID '${connectorId}'`,
    404
  );
};
