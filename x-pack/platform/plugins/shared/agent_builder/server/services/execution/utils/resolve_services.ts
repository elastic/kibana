/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { MODEL_TELEMETRY_METADATA } from '../../../telemetry';
import type { ConversationService } from '../../conversation';
import type { AgentsServiceStart } from '../../agents';
import { resolveSelectedConnectorId } from '../../../utils/resolve_selected_connector_id';

export const resolveServices = async ({
  agentId,
  connectorId,
  request,
  logger,
  inference,
  conversationService,
  agentService,
  uiSettings,
  savedObjects,
  searchInferenceEndpoints,
}: {
  agentId: string;
  connectorId?: string;
  request: KibanaRequest;
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}) => {
  const selectedConnectorId = await resolveSelectedConnectorId({
    request,
    connectorId,
    uiSettings,
    savedObjects,
    inference,
    searchInferenceEndpoints,
  });

  if (!selectedConnectorId) {
    throw new Error('No connector available for chat execution');
  }

  const hasAgent = await agentService
    .getRegistry({ request })
    .then((agentRegistry) => agentRegistry.has(agentId));

  if (!hasAgent) {
    throw new Error(`Agent "${agentId}" not found or not available`);
  }

  const [conversationClient, chatModel] = await Promise.all([
    conversationService.getScopedClient({ request }),
    inference.getChatModel({
      request,
      connectorId: selectedConnectorId,
      chatModelOptions: {
        telemetryMetadata: MODEL_TELEMETRY_METADATA,
      },
    }),
  ]);

  return {
    conversationClient,
    chatModel,
    selectedConnectorId,
  };
};
