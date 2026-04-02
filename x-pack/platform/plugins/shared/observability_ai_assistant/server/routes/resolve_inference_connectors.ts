/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify, notFound, serverUnavailable } from '@hapi/boom';
import type { InferenceConnector } from '@kbn/inference-common';
import { isInferenceError } from '@kbn/inference-common';
import type { ResolvedInferenceEndpoints } from '@kbn/search-inference-endpoints/server';
import { MODEL_SETTINGS_FEATURE_FLAG_ID } from '@kbn/search-inference-endpoints/common/constants';
import { OBSERVABILITY_AI_ASSISTANT_INFERENCE_SUBFEATURE_ID } from '../../common/feature';
import type { ObservabilityAIAssistantRouteHandlerResources } from './types';

type ResolveArgs = Pick<
  ObservabilityAIAssistantRouteHandlerResources,
  'context' | 'request' | 'logger'
> & {
  plugins: Pick<
    ObservabilityAIAssistantRouteHandlerResources['plugins'],
    'searchInferenceEndpoints' | 'inference'
  >;
};

/**
 * Returns the connector list for Observability AI Assistant.
 *
 * When Model Settings is enabled and inference endpoints are returned, returns only those.
 * Otherwise falls back to the full inference connector list.
 */
export async function resolveConnectorList({
  context,
  plugins,
  request,
  logger,
}: ResolveArgs): Promise<InferenceConnector[]> {
  const resolved = await loadEndpoints({ context, plugins, request, logger });

  if (resolved) {
    return resolved.endpoints;
  }

  const inferenceStart = await plugins.inference.start();
  return inferenceStart.getConnectorList(request);
}

/**
 * Returns a single connector by id for Observability AI Assistant.
 *
 * When Model Settings is enabled and SIEP returns endpoints, the connector must be in them (404 otherwise).
 * Otherwise falls back to the inference plugin.
 */
export async function resolveConnectorById({
  context,
  plugins,
  request,
  logger,
  connectorId,
}: ResolveArgs & { connectorId: string }): Promise<InferenceConnector> {
  const resolved = await loadEndpoints({ context, plugins, request, logger });

  if (resolved) {
    const connector = resolved.endpoints.find((c) => c.connectorId === connectorId);
    if (!connector) {
      throw notFound(
        `Inference endpoint "${connectorId}" is not configured for Observability AI Assistant in this space.`
      );
    }
    return connector;
  }

  const inferenceStart = await plugins.inference.start();
  try {
    return await inferenceStart.getConnectorById(connectorId, request);
  } catch (error) {
    if (isInferenceError(error) && error.status) {
      throw boomify(error, { statusCode: error.status });
    }
    throw error;
  }
}

async function loadEndpoints({
  context,
  plugins,
  request,
  logger,
}: ResolveArgs): Promise<ResolvedInferenceEndpoints | null> {
  const modelSettingsEnabled = await (
    await context.core
  ).uiSettings.client.get<boolean>(MODEL_SETTINGS_FEATURE_FLAG_ID);

  if (!modelSettingsEnabled) {
    return null;
  }

  const siepStart = await plugins.searchInferenceEndpoints?.start();
  if (!siepStart) {
    logger.debug('searchInferenceEndpoints plugin unavailable; skipping Model Settings resolution');
    return null;
  }

  try {
    const result = await siepStart.endpoints.getForFeature(
      OBSERVABILITY_AI_ASSISTANT_INFERENCE_SUBFEATURE_ID,
      request
    );
    result.warnings.forEach((w) => logger.warn(w));

    if (!result.soEntryFound) {
      logger.debug(
        'No saved-object configuration found for Observability AI Assistant inference endpoints; falling back'
      );
      return null;
    }

    return result;
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
