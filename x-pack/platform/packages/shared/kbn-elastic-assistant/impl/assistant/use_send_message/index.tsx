/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useCallback, useRef, useState } from 'react';
import { ApiConfig, INVOKE_LLM_CLIENT_TIMEOUT, Replacements } from '@kbn/elastic-assistant-common';
import moment from 'moment';
import { useAssistantContext } from '../../assistant_context';
import { fetchConnectorExecuteAction, FetchConnectorExecuteResponse } from '../api';
import * as i18n from './translations';

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
      }, INVOKE_LLM_CLIENT_TIMEOUT);

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
          screenContext: {
            timeZone: moment.tz.guess(),
          },
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
