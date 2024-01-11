/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useCallback, useState } from 'react';

import { useAssistantContext } from '../../assistant_context';
import { Conversation, Message } from '../../assistant_context/types';
import { fetchConnectorExecuteAction, FetchConnectorExecuteResponse } from '../api';

interface SendMessagesProps {
  allow?: string[];
  allowReplacement?: string[];
  apiConfig: Conversation['apiConfig'];
  http: HttpSetup;
  messages: Message[];
  onNewReplacements: (newReplacements: Record<string, string>) => void;
  replacements?: Record<string, string>;
}

interface UseSendMessages {
  isLoading: boolean;
  sendMessages: ({
    apiConfig,
    http,
    messages,
  }: SendMessagesProps) => Promise<FetchConnectorExecuteResponse>;
}

export const useSendMessages = (): UseSendMessages => {
  const {
    alertsIndexPattern,
    assistantStreamingEnabled,
    defaultAllow,
    defaultAllowReplacement,
    knowledgeBase,
  } = useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessages = useCallback(
    async ({ apiConfig, http, messages, onNewReplacements, replacements }: SendMessagesProps) => {
      setIsLoading(true);

      try {
        return await fetchConnectorExecuteAction({
          isEnabledRAGAlerts: knowledgeBase.isEnabledRAGAlerts, // settings toggle
          alertsIndexPattern,
          allow: defaultAllow,
          allowReplacement: defaultAllowReplacement,
          apiConfig,
          isEnabledKnowledgeBase: knowledgeBase.isEnabledKnowledgeBase,
          assistantStreamingEnabled,
          http,
          replacements,
          messages,
          size: knowledgeBase.latestAlerts,
          onNewReplacements,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      alertsIndexPattern,
      assistantStreamingEnabled,
      defaultAllow,
      defaultAllowReplacement,
      knowledgeBase.isEnabledRAGAlerts,
      knowledgeBase.isEnabledKnowledgeBase,
      knowledgeBase.latestAlerts,
    ]
  );

  return { isLoading, sendMessages };
};
