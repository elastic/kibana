/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger, KibanaRequest } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { logIfConnectorNotInAllowlist } from './log_if_connector_not_in_allowlist';
import { resolveConnectorId } from './resolve_connector_id';

export async function resolveConnectorIdAndCheckAllowlist({
  connectorId,
  uiSettingsClient,
  logger,
  featureId,
  searchInferenceEndpoints,
  request,
}: {
  connectorId?: string;
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  featureId: string;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  request: KibanaRequest;
}): Promise<string> {
  const resolved = await resolveConnectorId({ connectorId, uiSettingsClient, logger, request });
  return logIfConnectorNotInAllowlist({
    resolvedConnectorId: resolved,
    featureId,
    searchInferenceEndpoints,
    logger,
    request,
  });
}
