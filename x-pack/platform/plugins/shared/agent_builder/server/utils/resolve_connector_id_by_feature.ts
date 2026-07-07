/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';

export interface ResolveConnectorIdByFeatureParams {
  featureId: string;
  request: KibanaRequest;
  inference: InferenceServerStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}

/**
 * Resolves a connector id from a Model Management > Feature settings feature id.
 * Falls back to the default AI connector when the feature has no configured endpoint.
 */
export const resolveConnectorIdByFeature = async ({
  featureId,
  request,
  inference,
  searchInferenceEndpoints,
}: ResolveConnectorIdByFeatureParams): Promise<string> => {
  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(featureId, request);
  if (endpoints.length > 0) {
    return endpoints[0].connectorId;
  }

  const defaultConnector = await inference.getDefaultConnector(request);
  if (defaultConnector) {
    return defaultConnector.connectorId;
  }

  throw new Error(
    `No connector configured for feature "${featureId}" and no default AI connector configured.`
  );
};
