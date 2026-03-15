/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest, ElasticsearchClient, Logger } from '@kbn/core/server';
import { createInferenceRequestError, type InferenceConnector } from '@kbn/inference-common';
import { getConnectorList } from './get_connector_list';

/**
 * Retrieves a connector or inference endpoint given the provided `connectorId`.
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

  if (!match) {
    throw createInferenceRequestError(
      `No connector or inference endpoint found for ID '${connectorId}'`,
      404
    );
  }

  return match;
};
