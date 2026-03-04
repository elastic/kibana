/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
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
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
  esClient: ElasticsearchClient;
}): Promise<InferenceConnector> => {
  const connectors = await getConnectorList({ actions, request, esClient });
  const match = connectors.find((c) => c.connectorId === connectorId);

  if (!match) {
    throw createInferenceRequestError(
      `No connector or inference endpoint found for id '${connectorId}'`,
      404
    );
  }

  return match;
};
