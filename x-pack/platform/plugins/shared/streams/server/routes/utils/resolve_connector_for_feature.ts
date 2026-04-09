/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { StatusError } from '../../lib/streams/errors/status_error';

/**
 * Resolves the connector ID for a registered inference feature via the Inference Feature Registry.
 *
 * Resolution order (delegated to `getForFeature`):
 *   1. Admin override in the `inference_settings` SO (set via Model Settings page)
 *   2. `recommendedEndpoints` from the feature registration
 *   3. Platform default connector
 *
 * @throws StatusError(503) if the searchInferenceEndpoints plugin is unavailable.
 * @throws StatusError(400) if no connector resolves for the feature.
 */
export async function resolveConnectorForFeature({
  searchInferenceEndpoints,
  featureId,
  featureName,
  request,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  featureId: string;
  featureName: string;
  request: KibanaRequest;
}): Promise<string> {
  if (!searchInferenceEndpoints) {
    throw new StatusError('Inference endpoints plugin is unavailable.', 503);
  }

  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(featureId, request);

  if (endpoints.length === 0) {
    throw new StatusError(
      `No connector configured for ${featureName}. Configure one in Stack Management > Model Settings.`,
      400
    );
  }

  return endpoints[0].connectorId;
}
