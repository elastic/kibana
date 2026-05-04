/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { KibanaRequest, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RawConnector } from '@kbn/inference-common';
import {
  createInferenceRequestError,
  InferenceConnectorType,
  type InferenceConnector,
} from '@kbn/inference-common';
import type { ActionsClientProvider } from '../types';
import { getConnectorList } from './get_connector_list';

/**
 * Given a merged connector list and the raw stack connectors, find the connector
 * matching `connectorId`. Falls back to resolving `.inference` stack connector
 * aliases (where the stack connector ID differs from the inference endpoint ID
 * returned in the merged list).
 */
const findConnectorById = ({
  connectorId,
  connectors,
  rawStackConnectors,
}: {
  connectorId: string;
  connectors: InferenceConnector[];
  rawStackConnectors: RawConnector[];
}): InferenceConnector | undefined => {
  const match = connectors.find((c) => c.connectorId === connectorId);
  if (match) {
    return match;
  }

  // The requested ID may belong to a stack `.inference` connector whose underlying inference
  // endpoint was already returned in the list under `inferenceId`. Look up the raw stack
  // connector to resolve the alias.
  const stackConnector = rawStackConnectors.find((c) => c.id === connectorId);
  if (stackConnector?.actionTypeId === InferenceConnectorType.Inference) {
    const inferenceId = stackConnector.config?.inferenceId as string | undefined;
    if (inferenceId) {
      return connectors.find((c) => c.connectorId === inferenceId);
    }
  }

  return undefined;
};

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
  actions: ActionsClientProvider;
  request: KibanaRequest;
  connectorId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<InferenceConnector> => {
  const connectors = await getConnectorList({ actions, request, esClient, logger });

  const actionClient = await actions.getActionsClientWithRequest(request);
  const allStackConnectors = await actionClient.getAll({ includeSystemActions: false });

  const result = findConnectorById({
    connectorId,
    connectors,
    rawStackConnectors: allStackConnectors,
  });
  if (result) {
    return result;
  }

  throw createInferenceRequestError(
    `No connector or inference endpoint found for ID '${connectorId}'`,
    404
  );
};

/**
 * Retrieves a connector or inference endpoint given the provided `connectorId`,
 * using pre-scoped `actionsClient` and `esClient` instead of a {@link KibanaRequest}.
 *
 * This is useful for background tasks (e.g. alerting rule executors) that already
 * have scoped clients but no HTTP request context.
 */
export const getConnectorByIdWithoutClientRequest = async ({
  connectorId,
  actionsClient,
  esClient,
  logger,
}: {
  connectorId: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<InferenceConnector> => {
  const connectors = await getConnectorList({ actionsClient, esClient, logger });

  const allStackConnectors = await actionsClient.getAll({ includeSystemActions: false });

  const result = findConnectorById({
    connectorId,
    connectors,
    rawStackConnectors: allStackConnectors,
  });
  if (result) {
    return result;
  }

  throw createInferenceRequestError(
    `No connector or inference endpoint found for ID '${connectorId}'`,
    404
  );
};
