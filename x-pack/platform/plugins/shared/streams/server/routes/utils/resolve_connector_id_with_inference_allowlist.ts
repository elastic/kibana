/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { pickAllowedConnectorForInferenceFeature } from './pick_allowed_connector_for_inference_feature';
import { resolveConnectorId } from './resolve_connector_id';

export async function resolveConnectorIdWithInferenceAllowlist({
  connectorId,
  uiSettingsClient,
  logger,
  featureId,
  searchInferenceEndpoints,
}: {
  connectorId?: string;
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  featureId: string;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
}): Promise<string> {
  const resolved = await resolveConnectorId({ connectorId, uiSettingsClient, logger });
  return pickAllowedConnectorForInferenceFeature({
    resolvedConnectorId: resolved,
    featureId,
    searchInferenceEndpoints,
    logger,
  });
}
