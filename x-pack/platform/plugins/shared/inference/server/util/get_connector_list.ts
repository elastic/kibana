/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  isSupportedConnector,
  connectorToInference,
  InferenceConnectorType,
} from '@kbn/inference-common';
import { getInferenceEndpoints } from './get_inference_endpoints';

export const getConnectorList = async ({
  actions,
  request,
  esClient,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): Promise<InferenceConnector[]> => {
  const [connectors, endpoints] = await Promise.all([
    getStackConnectors({ actions, request }),
    getInferenceEndpoints({ esClient, taskType: 'chat_completion' }),
  ]);

  const connectorInferenceIds = new Set(
    connectors
      .filter((c) => c.type === InferenceConnectorType.Inference)
      .map((c) => c.config?.inferenceId as string)
      .filter(Boolean)
  );

  const inferenceEndpointConnectors: InferenceConnector[] = endpoints
    .filter((ep) => !connectorInferenceIds.has(ep.inferenceId))
    .map((ep) => ({
      type: InferenceConnectorType.Inference,
      name: ep.inferenceId,
      connectorId: ep.inferenceId,
      config: {
        inferenceId: ep.inferenceId,
        taskType: ep.taskType,
        service: ep.service,
        serviceSettings: ep.serviceSettings,
      },
      capabilities: {},
      isInferenceEndpoint: true,
    }));

  return [...connectors, ...inferenceEndpointConnectors];
};

const getStackConnectors = async ({
  actions,
  request,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
}): Promise<InferenceConnector[]> => {
  const actionClient = await actions.getActionsClientWithRequest(request);

  const allConnectors = await actionClient.getAll({
    includeSystemActions: false,
  });

  return allConnectors
    .filter((connector) => isSupportedConnector(connector))
    .map(connectorToInference);
};
