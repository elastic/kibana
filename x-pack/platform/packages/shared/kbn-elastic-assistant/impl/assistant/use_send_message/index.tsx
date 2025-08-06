/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useCallback, useRef, useState } from 'react';
import { ApiConfig, Replacements } from '@kbn/elastic-assistant-common';
import moment from 'moment';
import { useAssistantContext } from '../../assistant_context';
import { fetchConnectorExecuteAction, FetchConnectorExecuteResponse } from '../api';

interface ClientSideTool {
  name: string;
  description: string;
  callback: (blah: any) => void;
}

interface SendMessageProps {
  apiConfig: ApiConfig;
  http: HttpSetup;
  message?: string;
  conversationId: string;
  replacements: Replacements;
  clientSideTools?: ClientSideTool[];
}

interface UseSendMessage {
  abortStream: () => void;
  isLoading: boolean;
  sendMessage: ({
    apiConfig,
    http,
    message,
    clientSideTools,
  }: SendMessageProps) => Promise<FetchConnectorExecuteResponse>;
}

// const fetchMetadataForToolId = async (toolId: string) => {
//   const response = await http.fetch(`/internal/elastic_assistant/actions/connector/${toolId}/metadata`, {
//     method: 'GET',
//     version: '1',
//   });
//   return response.data;
// };
// export const useGetMetadata = () => {
//   const { http } = useAssistantContext();
//   const [isLoading, setIsLoading] = useState(false);
//   const abortController = useRef(new AbortController());
//   const getMetadata = useCallback(async () => {
//     setIsLoading(true);
//   }, []);

export const useSendMessage = (): UseSendMessage => {
  const { alertsIndexPattern, assistantStreamingEnabled, knowledgeBase, traceOptions } =
    useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);
  const abortController = useRef(new AbortController());
  const sendMessage = useCallback(
    async ({ apiConfig, http, message, conversationId, replacements, clientSideTools }: SendMessageProps) => {
      setIsLoading(true);

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
            clientSideTools,
          },
        });
      } finally {
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
