/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notFound, serverUnavailable } from '@hapi/boom';
import type { InferenceConnector } from '@kbn/inference-common';
import type { ResolvedInferenceEndpoints } from '@kbn/search-inference-endpoints/server';
import { OBSERVABILITY_AI_ASSISTANT_MODEL_SETTINGS_FEATURE_ID } from '../../../common/feature';
import type { ObservabilityAIAssistantRouteHandlerResources } from '../types';

type ModelSettingsLoadArgs = Pick<
  ObservabilityAIAssistantRouteHandlerResources,
  'request' | 'logger'
> & {
  plugins: Pick<
    ObservabilityAIAssistantRouteHandlerResources['plugins'],
    'searchInferenceEndpoints'
  >;
};

/**
 * When search-inference-endpoints is available, loads the resolved allow-list for
 * Observability AI Assistant.
 */
export async function loadObservabilityAssistantModelSettingsEndpoints({
  plugins,
  request,
  logger,
}: ModelSettingsLoadArgs): Promise<ResolvedInferenceEndpoints | null> {
  const searchInferenceEndpointsStart = await plugins.searchInferenceEndpoints?.start();
  if (!searchInferenceEndpointsStart) {
    logger.debug(
      'searchInferenceEndpoints plugin unavailable; skipping inference endpoint feature resolution'
    );
    return null;
  }

  try {
    const featureEndpoints = await searchInferenceEndpointsStart.endpoints.getForFeature(
      OBSERVABILITY_AI_ASSISTANT_MODEL_SETTINGS_FEATURE_ID,
      request
    );
    featureEndpoints.warnings.forEach((warning) => logger.warn(warning));
    return featureEndpoints;
  } catch (error) {
    logger.warn(
      `Failed to resolve inference endpoints for Observability AI Assistant feature. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw serverUnavailable(
      'Inference endpoint settings are temporarily unavailable. Try again shortly.'
    );
  }
}

export function selectInferenceConnectorListFromModelSettings(
  featureEndpoints: ResolvedInferenceEndpoints | null
): InferenceConnector[] | null {
  if (featureEndpoints?.endpoints.length) {
    return featureEndpoints.endpoints;
  }
  return null;
}

/**
 * If Model Settings produced a non-empty allow-list, returns the matching connector or throws 404.
 * Otherwise returns null so the caller can fall back to the inference plugin.
 */
export function selectInferenceConnectorByIdFromModelSettings(
  featureEndpoints: ResolvedInferenceEndpoints | null,
  connectorId: string
): InferenceConnector | null {
  if (!featureEndpoints) {
    return null;
  }

  if (featureEndpoints.endpoints.length > 0) {
    const connector = featureEndpoints.endpoints.find((c) => c.connectorId === connectorId);
    if (!connector) {
      throw notFound(
        `Inference endpoint "${connectorId}" is not configured for Observability AI Assistant in this space.`
      );
    }
    return connector;
  }

  if (featureEndpoints.soEntryFound) {
    throw badRequest(
      'No inference endpoints are configured for Observability AI Assistant in this space.'
    );
  }

  return null;
}

export async function validateConnectorIdAgainstObservabilityModelSettings({
  plugins,
  request,
  logger,
  connectorId,
}: ModelSettingsLoadArgs & { connectorId: string }): Promise<void> {
  const resolved = await loadObservabilityAssistantModelSettingsEndpoints({
    plugins,
    request,
    logger,
  });

  if (!resolved) {
    return;
  }

  if (resolved.endpoints.length > 0) {
    const allowed = new Set(resolved.endpoints.map((endpoint) => endpoint.connectorId));
    if (!allowed.has(connectorId)) {
      throw badRequest(
        `Inference endpoint "${connectorId}" is not configured for Observability AI Assistant in this space.`
      );
    }
    return;
  }

  if (resolved.soEntryFound) {
    throw badRequest(
      'No inference endpoints are configured for Observability AI Assistant in this space.'
    );
  }
}
