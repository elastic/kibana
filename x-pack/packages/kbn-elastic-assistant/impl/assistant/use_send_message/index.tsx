/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useCallback, useRef, useState } from 'react';
import { ApiConfig, Replacements } from '@kbn/elastic-assistant-common';
import { useAssistantContext } from '../../assistant_context';
import { fetchConnectorExecuteAction, FetchConnectorExecuteResponse } from '../api';

interface SendMessageProps {
  allow?: string[];
  allowReplacement?: string[];
  apiConfig: ApiConfig;
  http: HttpSetup;
  message?: string;
  conversationId: string;
  replacements: Replacements;
}

interface UseSendMessage {
  abortStream: () => void;
  isLoading: boolean;
  sendMessage: ({
    apiConfig,
    http,
    message,
  }: SendMessageProps) => Promise<FetchConnectorExecuteResponse>;
}

export const useSendMessage = (): UseSendMessage => {
  const {
    alertsIndexPattern,
    assistantStreamingEnabled,
    defaultAllow,
    defaultAllowReplacement,
    knowledgeBase,
    traceOptions,
  } = useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);
  const abortController = useRef(new AbortController());
  const sendMessage = useCallback(
    async ({ apiConfig, http, message, conversationId, replacements }: SendMessageProps) => {
      setIsLoading(true);

      try {
        return await fetchConnectorExecuteAction({
          conversationId,
          isEnabledRAGAlerts: knowledgeBase.isEnabledRAGAlerts, // settings toggle
          alertsIndexPattern,
          allow: defaultAllow,
          allowReplacement: defaultAllowReplacement,
          apiConfig,
          isEnabledKnowledgeBase: knowledgeBase.isEnabledKnowledgeBase,
          assistantStreamingEnabled,
          http,
          message,
          replacements,
          signal: abortController.current.signal,
          size: knowledgeBase.latestAlerts,
          traceOptions,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      knowledgeBase.isEnabledRAGAlerts,
      knowledgeBase.isEnabledKnowledgeBase,
      knowledgeBase.latestAlerts,
      alertsIndexPattern,
      defaultAllow,
      defaultAllowReplacement,
      assistantStreamingEnabled,
      traceOptions,
    ]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { isLoading, sendMessage, abortStream: cancelRequest };
};
