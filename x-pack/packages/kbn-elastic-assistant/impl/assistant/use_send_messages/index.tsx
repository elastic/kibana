/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { HttpSetup } from '@kbn/core-http-browser';

import { useAssistantContext } from '../../assistant_context';
import { Conversation, Message } from '../../assistant_context/types';
import { fetchConnectorExecuteAction, FetchConnectorExecuteResponse } from '../api';

interface SendMessagesProps {
  http: HttpSetup;
  messages: Message[];
  apiConfig: Conversation['apiConfig'];
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
  const { knowledgeBase } = useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessages = useCallback(
    async ({ apiConfig, http, messages }: SendMessagesProps) => {
      setIsLoading(true);
      try {
        return await fetchConnectorExecuteAction({
          assistantLangChain: knowledgeBase.assistantLangChain,
          http,
          messages,
          apiConfig,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [knowledgeBase.assistantLangChain]
  );

  return { isLoading, sendMessages };
};
