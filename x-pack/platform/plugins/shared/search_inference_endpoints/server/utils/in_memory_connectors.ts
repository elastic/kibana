/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { InMemoryConnector } from '@kbn/actions-plugin/server';
import {
  isInferenceEndpointWithMetadata,
  isInferenceEndpointWithDisplayNameMetadata,
} from '../../common/type_guards';

const CHAT_COMPLETION_TASK_TYPE = 'chat_completion';
const KIBANA_CONNECTOR_PROPERTY = 'kibana-connector';

export function filterPreconfiguredEndpoints(
  endpoints: InferenceInferenceEndpointInfo[]
): InferenceInferenceEndpointInfo[] {
  return endpoints.filter(
    (endpoint) =>
      isInferenceEndpointWithMetadata(endpoint) &&
      endpoint.metadata?.heuristics?.properties?.includes(KIBANA_CONNECTOR_PROPERTY) &&
      endpoint.task_type === CHAT_COMPLETION_TASK_TYPE
  );
}

type InMemoryConnectorWithInferenceId = InMemoryConnector & { config: { inferenceId: string } };

function isConnectorWithInferenceId(
  connector: InMemoryConnector
): connector is InMemoryConnectorWithInferenceId {
  return !!(
    connector.actionTypeId === '.inference' &&
    connector.config?.inferenceId &&
    typeof connector.config.inferenceId === 'string'
  );
}

export function findEndpointsWithoutConnectors(
  endpoints: InferenceInferenceEndpointInfo[],
  connectors: InMemoryConnector[]
): InferenceInferenceEndpointInfo[] {
  const existingConnectorInferenceIds = connectors
    .filter(isConnectorWithInferenceId)
    .map((connector) => connector.config.inferenceId);
  return endpoints.filter(
    (endpoint) => !existingConnectorInferenceIds.includes(endpoint.inference_id)
  );
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
  if (isInferenceEndpointWithDisplayNameMetadata(endpoint)) {
    return endpoint.metadata.display.name;
  }
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
