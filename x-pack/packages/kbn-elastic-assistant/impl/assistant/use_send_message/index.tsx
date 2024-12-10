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
import * as i18n from './translations';

/**
 * TODO: This is a workaround to solve the issue with the long standing server tasks while cahtting with the assistant.
 * Some models (like Llama 3.1 70B) can perform poorly and be slow which leads to a long time to handle the request.
 * The `core-http-browser` has a timeout of two minutes after which it will re-try the request. In combination with the slow model it can lead to
 * a situation where core http client will initiate same request again and again.
 * To avoid this, we abort http request after timeout which is slightly below two minutes.
 */
const EXECUTE_ACTION_TIMEOUT = 110 * 1000; // in milliseconds

interface SendMessageProps {
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
  const { alertsIndexPattern, assistantStreamingEnabled, knowledgeBase, traceOptions } =
    useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);
  const abortController = useRef(new AbortController());
  const sendMessage = useCallback(
    async ({ apiConfig, http, message, conversationId, replacements }: SendMessageProps) => {
      setIsLoading(true);

      const timeoutId = setTimeout(() => {
        abortController.current.abort(i18n.FETCH_MESSAGE_TIMEOUT_ERROR);
        abortController.current = new AbortController();
      }, EXECUTE_ACTION_TIMEOUT);

      try {
        return await fetchConnectorExecuteAction({
          conversationId,
          alertsIndexPattern,
          apiConfig,
          assistantStreamingEnabled,
          http,
          message,
          replacements,
          signal: abortController.current.signal,
          size: knowledgeBase.latestAlerts,
          traceOptions,
        });
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    },
    [alertsIndexPattern, assistantStreamingEnabled, knowledgeBase.latestAlerts, traceOptions]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { isLoading, sendMessage, abortStream: cancelRequest };
};
