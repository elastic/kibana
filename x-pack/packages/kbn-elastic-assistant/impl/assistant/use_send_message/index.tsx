/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { ApiConfig, Replacements } from '@kbn/elastic-assistant-common';
import { useMutation } from '@tanstack/react-query';
import { useAssistantContext } from '../../assistant_context';
import { fetchConnectorExecuteAction } from '../api';

interface SendMessageProps {
  apiConfig: ApiConfig;
  http: HttpSetup;
  message?: string;
  conversationId: string;
  replacements: Replacements;
}

export const useSendMessage = () => {
  const { alertsIndexPattern, assistantStreamingEnabled, knowledgeBase, traceOptions } =
    useAssistantContext();

  return useMutation({
    mutationKey: ['useSendMessage'],
    mutationFn: async ({
      apiConfig,
      http,
      message,
      conversationId,
      replacements,
    }: SendMessageProps) =>
      fetchConnectorExecuteAction({
        conversationId,
        isEnabledRAGAlerts: knowledgeBase.isEnabledRAGAlerts, // settings toggle
        alertsIndexPattern,
        apiConfig,
        isEnabledKnowledgeBase: knowledgeBase.isEnabledKnowledgeBase,
        assistantStreamingEnabled,
        http,
        message,
        replacements,
        size: knowledgeBase.latestAlerts,
        traceOptions,
      }),
  });
};
