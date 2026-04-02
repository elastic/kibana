/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';

/** Logs at info if the resolved connector is outside the feature allowlist; usage continues. */
export async function logIfConnectorNotInAllowlist({
  resolvedConnectorId,
  featureId,
  searchInferenceEndpoints,
  logger,
  request,
}: {
  resolvedConnectorId: string;
  featureId: string;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  logger: Logger;
  request: KibanaRequest;
}): Promise<string> {
  if (!searchInferenceEndpoints) {
    return resolvedConnectorId;
  }

  try {
    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      featureId,
      request
    );
    if (endpoints.length === 0) {
      return resolvedConnectorId;
    }

    const allowed = new Set(endpoints.map((e) => e.connectorId));
    if (allowed.has(resolvedConnectorId)) {
      return resolvedConnectorId;
    }

    logger.info(
      `Connector "${resolvedConnectorId}" is not in the Model Settings allowlist for inference feature "${featureId}"; continuing anyway. Update Model Settings or saved Streams Significant Events connector selection to align.`
    );
    return resolvedConnectorId;
  } catch (err) {
    logger.info(
      `Could not verify inference allowlist for feature "${featureId}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return resolvedConnectorId;
  }
}
