/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ChatCompletionReasoningEffort } from '@kbn/inference-common';
import { getSupportedReasoningEffortLevels } from '@kbn/inference-common';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { resolveSelectedConnectorId } from '../../../utils/resolve_selected_connector_id';

/**
 * Checks that the model an execution will run on supports the requested reasoning level.
 *
 * @param connectorId - Connector requested by the caller.
 * @throws {AgentBuilderBadRequestError} when the model does not support `reasoningLevel`.
 */
export const validateReasoningLevel = async ({
  reasoningLevel,
  connectorId,
  request,
  inference,
  uiSettings,
  savedObjects,
  searchInferenceEndpoints,
}: {
  reasoningLevel: ChatCompletionReasoningEffort;
  connectorId?: string;
  request: KibanaRequest;
  inference: InferenceServerStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}): Promise<void> => {
  const connector = await resolveSelectedConnectorId({
    request,
    connectorId,
    uiSettings,
    savedObjects,
    inference,
    searchInferenceEndpoints,
  })
    .then((resolvedConnectorId) =>
      resolvedConnectorId ? inference.getConnectorById(resolvedConnectorId, request) : undefined
    )
    // Skips the check when the connector cannot be resolved
    .catch(() => undefined);
  if (!connector) {
    return;
  }

  const supportedLevels = getSupportedReasoningEffortLevels(connector);
  if (supportedLevels === undefined || supportedLevels.includes(reasoningLevel)) {
    return;
  }

  throw createBadRequestError(
    `Reasoning level "${reasoningLevel}" is not supported by model "${connector.name}" (${
      connector.connectorId
    }). Supported levels: ${supportedLevels.join(', ')}.`
  );
};
