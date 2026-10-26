/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { AGENT_BUILDER_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';

type ExecutionConnectorSource = 'request' | 'agent_feature' | 'default';

interface ResolvedExecutionConnector {
  connectorId?: string;
  connector?: InferenceConnector;
  source: ExecutionConnectorSource;
}

/**
 * Resolves the connector an execution runs on, using the first of:
 * 1. The connector requested by the caller.
 * 2. The first endpoint configured for the agent's inference feature.
 * 3. The Agent Builder feature's first endpoint.
 *
 * @param connectorId - Connector requested by the caller.
 * @param inferenceFeatureId - Inference feature declared by the agent, if any.
 * @returns The connector, with the step it came from as `source`. `connectorId` is `undefined`
 * when no step resolves one.
 */
export const resolveExecutionConnectorId = async ({
  connectorId,
  inferenceFeatureId,
  request,
  searchInferenceEndpoints,
}: {
  connectorId?: string;
  inferenceFeatureId?: string;
  request: KibanaRequest;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}): Promise<ResolvedExecutionConnector> => {
  if (connectorId !== undefined) {
    return { connectorId, source: 'request' };
  }

  if (inferenceFeatureId !== undefined) {
    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      inferenceFeatureId,
      request,
      { onlyReturnConfigured: true }
    );
    const [featureEndpoint] = endpoints;
    if (featureEndpoint) {
      return {
        connectorId: featureEndpoint.connectorId,
        connector: featureEndpoint,
        source: 'agent_feature',
      };
    }
  }

  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
    AGENT_BUILDER_INFERENCE_FEATURE_ID,
    request
  );
  const [defaultEndpoint] = endpoints;
  return {
    connectorId: defaultEndpoint?.connectorId,
    connector: defaultEndpoint,
    source: 'default',
  };
};
