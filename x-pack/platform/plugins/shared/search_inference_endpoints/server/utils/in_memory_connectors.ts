/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { InMemoryConnector } from '@kbn/actions-plugin/server';

const CHAT_COMPLETION_TASK_TYPE = 'chat_completion';
const EIS_SERVICE_PROVIDER = 'elastic';

export function filterPreconfiguredEndpoints(
  endpoints: InferenceInferenceEndpointInfo[]
): InferenceInferenceEndpointInfo[] {
  return endpoints.filter(
    (endpoint) =>
      endpoint.service === EIS_SERVICE_PROVIDER &&
      // TODO: update this when endpoints have metadata to identify if they are preconfigured
      endpoint.inference_id.startsWith('.') &&
      endpoint.task_type === CHAT_COMPLETION_TASK_TYPE
  );
}

export function findEndpointsWithoutConnectors(
  endpoints: InferenceInferenceEndpointInfo[],
  connectors: InMemoryConnector[]
): InferenceInferenceEndpointInfo[] {
  const existingConnectorInferenceIds = connectors
    .filter(
      (connector) =>
        connector.actionTypeId === '.inference' &&
        connector.config?.inferenceId &&
        typeof connector.config.inferenceId === 'string'
    )
    .map((connector) => connector.config.inferenceId as string);
  return endpoints.filter((endpoint) => {
    return existingConnectorInferenceIds.includes(endpoint.inference_id) === false;
  });
}

export function connectorFromEndpoint(endpoint: InferenceInferenceEndpointInfo): InMemoryConnector {
  return {
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
  };
}

export function getConnectorIdFromEndpoint(endpoint: InferenceInferenceEndpointInfo): string {
  return endpoint.inference_id;
}

const MODEL_ID_DISPLAY_NAMES: Record<string, string> = {
  'rainbow-sprinkles': 'Anthropic Claude Sonnet 3.7',
  'gp-llm-v2': 'Anthropic Claude Sonnet 4.5',
};

export function getConnectorNameFromEndpoint(endpoint: InferenceInferenceEndpointInfo): string {
  const modelId = endpoint.service_settings?.model_id;
  if (modelId) {
    if (MODEL_ID_DISPLAY_NAMES[modelId]) {
      return MODEL_ID_DISPLAY_NAMES[modelId];
    }
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
