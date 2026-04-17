/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type {
  InferenceEndpointWithMetadata,
  InferenceEndpointWithDisplayNameMetadata,
  InferenceEndpointWithDisplayCreatorMetadata,
} from './types';

const CHAT_COMPLETION_TASK_TYPE = 'chat_completion';
const KIBANA_CONNECTOR_HEURISTIC = 'kibana-connector';

/**
 * True when the endpoint is a chat-completion inference entry managed as a Kibana dynamic
 * connector (see `filterPreconfiguredEndpoints` in server utils).
 */
export function isInferenceEndpointWithKibanaConnectorHeuristic(
  endpoint: InferenceInferenceEndpointInfo
): boolean {
  if (endpoint.task_type !== CHAT_COMPLETION_TASK_TYPE) {
    return false;
  }
  if (!isInferenceEndpointWithMetadata(endpoint)) {
    return false;
  }
  const properties = endpoint.metadata?.heuristics?.properties;
  return Array.isArray(properties) && properties.includes(KIBANA_CONNECTOR_HEURISTIC);
}

export function isInferenceEndpointWithMetadata(
  endpoint: InferenceInferenceEndpointInfo
): endpoint is InferenceEndpointWithMetadata {
  return (
    'metadata' in endpoint && typeof endpoint.metadata === 'object' && endpoint.metadata !== null
  );
}

export function isInferenceEndpointWithDisplayNameMetadata(
  endpoint: InferenceInferenceEndpointInfo
): endpoint is InferenceEndpointWithDisplayNameMetadata {
  if (!isInferenceEndpointWithMetadata(endpoint)) {
    return false;
  }
  const { metadata } = endpoint;
  return (
    metadata?.display?.name !== undefined &&
    typeof metadata.display.name === 'string' &&
    metadata.display.name.length > 0
  );
}

export function isInferenceEndpointWithDisplayCreatorMetadata(
  endpoint: InferenceInferenceEndpointInfo
): endpoint is InferenceEndpointWithDisplayCreatorMetadata {
  if (!isInferenceEndpointWithMetadata(endpoint)) {
    return false;
  }
  const { metadata } = endpoint;
  return (
    metadata?.display?.model_creator !== undefined &&
    typeof metadata.display.model_creator === 'string' &&
    metadata.display.model_creator.length > 0
  );
}
