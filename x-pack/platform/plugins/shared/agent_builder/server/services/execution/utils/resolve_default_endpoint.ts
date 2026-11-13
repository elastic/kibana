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

/**
 * Resolves the first endpoint configured for the Agent Builder inference feature, or `undefined`
 * when the feature has no endpoint available.
 */
export const resolveAgentBuilderDefaultEndpoint = async ({
  request,
  searchInferenceEndpoints,
}: {
  request: KibanaRequest;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}): Promise<InferenceConnector | undefined> => {
  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
    AGENT_BUILDER_INFERENCE_FEATURE_ID,
    request
  );
  return endpoints[0];
};
