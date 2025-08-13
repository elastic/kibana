/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAbortableAsync } from '@kbn/react-hooks';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CasesPublicStartDependencies } from '../../../types';

export const useChatService = () => {
  const { observabilityAIAssistant } = useKibana<CasesPublicStartDependencies>().services;
  const ObservabilityAIAssistantChatServiceContext =
    observabilityAIAssistant?.ObservabilityAIAssistantChatServiceContext;
  const obsAIService = observabilityAIAssistant?.service;
  const { connectors = [] } = observabilityAIAssistant?.useGenAIConnectors() || {};
  const isObsAIAssistantEnabled =
    ObservabilityAIAssistantChatServiceContext ||
    (Boolean(observabilityAIAssistant) && connectors?.length > 0);

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return obsAIService?.start({ signal }).catch((error) => {
        // TODO: Handle error appropriately
        return null;
      });
    },
    [obsAIService]
  );

  return {
    ObservabilityAIAssistantChatServiceContext,
    chatService: chatService || undefined,
    observabilityAIAssistantService: obsAIService,
    isObsAIAssistantEnabled,
    connectors,
  };
};
