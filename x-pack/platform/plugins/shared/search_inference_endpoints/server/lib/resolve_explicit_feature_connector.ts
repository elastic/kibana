/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '../types';

/**
 * Returns the connector an operator saved on this feature's own settings row, or
 * null when that row has none. Callers use this to prefer an optional row without
 * replacing the feature that still owns the default.
 */
export const resolveExplicitFeatureConnectorId = async ({
  featureId,
  request,
  searchInferenceEndpoints,
}: {
  featureId: string;
  request: KibanaRequest;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}): Promise<string | null> => {
  const feature = searchInferenceEndpoints.features.get(featureId);
  if (!feature || feature.taskType !== 'chat_completion') {
    return null;
  }

  const { endpoints, soEntryFound } = await searchInferenceEndpoints.endpoints.getForFeature(
    featureId,
    request,
    { onlyReturnConfigured: true, ownEntryOnly: true }
  );

  if (!soEntryFound || endpoints.length === 0) {
    return null;
  }

  return endpoints[0].connectorId;
};
