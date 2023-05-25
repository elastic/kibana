/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { HttpSetup } from '@kbn/core-http-browser';
import { Conversation, Message } from '../../assistant_context/types';
import { fetchConnectorExecuteAction } from '../api';

interface SendMessagesProps {
  http: HttpSetup;
  messages: Message[];
  apiConfig: Conversation['apiConfig'];
}

interface UseSendMessages {
  isLoading: boolean;
  sendMessages: ({ apiConfig, http, messages }: SendMessagesProps) => Promise<string>;
}

export const useSendMessages = (): UseSendMessages => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessages = useCallback(async ({ apiConfig, http, messages }: SendMessagesProps) => {
    setIsLoading(true);
    try {
      return await fetchConnectorExecuteAction({
        http,
        messages,
        apiConfig,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, sendMessages };
};
