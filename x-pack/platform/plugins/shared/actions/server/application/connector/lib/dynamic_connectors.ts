/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { InMemoryConnector } from '../../../types';

export function updateDynamicInMemoryConnectors(
  inMemoryConnectors: InMemoryConnector[],
  preconfiguredInferenceEndpoints: InferenceInferenceEndpointInfo[],
  logger: Logger
): boolean {
  let addedConnectors = false;

  const inferenceEndpointsWithoutConnectors = preconfiguredInferenceEndpoints.filter((endpoint) => {
    if (endpoint.task_type !== 'chat_completion' || endpoint.service !== 'elastic') {
      // Ignore non EIS or non chat_completion endpoints.
      // The calling function should do this filtering, but this is an extra guard to
      // avoid creating connectors for unsupported endpoint types.
      return false;
    }
    return (
      inMemoryConnectors.find((connector) => {
        if (
          connector.actionTypeId === '.inference' &&
          connector.config?.inferenceId === endpoint.inference_id
        ) {
          return true;
        }
        return false;
      }) === undefined
    );
  });

  const newConnectors = inferenceEndpointsWithoutConnectors.map(
    (endpoint): InMemoryConnector => ({
      id: getConnectorIdFromEndpoint(endpoint),
      name: getConnectorNameFromEndpoint(endpoint),
      actionTypeId: '.inference',
      exposeConfig: true,
      config: {
        provider: endpoint.service,
        taskType: endpoint.task_type,
        inferenceId: endpoint.inference_id,
        providerConfig: endpoint.service_settings,
      },
      secrets: {},
      isPreconfigured: true,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
      isDynamic: true,
      isDeprecated: false,
    })
  );

  if (newConnectors.length > 0) {
    inMemoryConnectors.push(...newConnectors);
    newConnectors.forEach((connector) => {
      logger.info(`Added dynamic connector for inference endpoint ${connector.config.inferenceId}`);
    });
    addedConnectors = true;
  }
  return addedConnectors;
}

function getConnectorIdFromEndpoint(endpoint: InferenceInferenceEndpointInfo) {
  return endpoint.inference_id;
}

function getConnectorNameFromEndpoint(endpoint: InferenceInferenceEndpointInfo) {
  const modelId = endpoint.service_settings?.model_id;
  if (modelId) {
    // This is a hack until we have a display name available from the endpoint metadata.
    const cleanModelId = modelId
      .replaceAll('-', ' ')
      .replace(/(^\w{1})|(\s{1}\w{1})/g, (match: string) => match.toUpperCase())
      .replaceAll('Gpt', 'GPT')
      .replaceAll('Openai', 'OpenAI');
    return cleanModelId;
  }

  return endpoint.inference_id;
}
