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
import type { ConversationService } from '../../conversation';
import type { AgentsServiceStart } from '../../agents';
import { resolveSelectedConnectorId } from '../../../utils/resolve_selected_connector_id';
import { createModelProvider } from '../runner/model_provider';

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
  userName,
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
  /**
   * Optional override for the conversation owner's username. Forwarded to
   * `conversationService.getScopedClient` so the conversation is persisted/looked up under
   * the originating user rather than whatever identity the (possibly fake) request resolves to.
   */
  userName?: string;
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

  const modelProvider = createModelProvider({
    inference,
    request,
    defaultConnectorId: selectedConnectorId,
    logger,
    uiSettings,
    savedObjects,
    searchInferenceEndpoints,
  });

  const conversationClient = await conversationService.getScopedClient({ request, userName });

  return {
    conversationClient,
    modelProvider,
    selectedConnectorId,
  };
};
