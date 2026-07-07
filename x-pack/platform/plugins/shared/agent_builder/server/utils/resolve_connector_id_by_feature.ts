/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';

export interface ResolveConnectorIdByFeatureParams {
  featureId: string;
  request: KibanaRequest;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}

/**
 * Resolves a connector id from a Model Management > Feature settings feature id.
 * `getForFeature` already returns an ordered, non-empty list in all normal cases
 * (admin override, recommended endpoints, or the global default/platform default
 * connector) — an empty result means no connector is configured anywhere.
 */
export const resolveConnectorIdByFeature = async ({
  featureId,
  request,
  searchInferenceEndpoints,
}: ResolveConnectorIdByFeatureParams): Promise<string> => {
  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(featureId, request);
  if (endpoints.length > 0) {
    return endpoints[0].connectorId;
  }

  throw new Error(`No connector available for feature "${featureId}".`);
};
