/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { AGENT_BUILDER_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';

/**
 * Resolves the connector an execution runs on.
 *
 * @param connectorId - Connector requested by the caller.
 * @returns `connectorId` when set, otherwise the Agent Builder feature's first endpoint, or
 * `undefined` when the feature resolves no endpoints.
 */
export const resolveExecutionConnectorId = async ({
  connectorId,
  request,
  searchInferenceEndpoints,
}: {
  connectorId?: string;
  request: KibanaRequest;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}): Promise<string | undefined> => {
  if (connectorId !== undefined) {
    return connectorId;
  }
  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
    AGENT_BUILDER_INFERENCE_FEATURE_ID,
    request
  );
  return endpoints[0]?.connectorId;
};
