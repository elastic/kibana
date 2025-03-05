/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { Replacements } from '@kbn/elastic-assistant-common';
import { EXECUTE_ACTION_TIMEOUT } from '../../use_send_message';
import { ChatCompleteResponse, postChatComplete } from './post_chat_complete';
import { useAssistantContext } from '../../../..';
import { FETCH_MESSAGE_TIMEOUT_ERROR } from '../../use_send_message/translations';
interface SendMessageProps {
  message: string;
  replacements: Replacements;
}
interface UseChatComplete {
  abortStream: () => void;
  isLoading: boolean;
  sendMessage: (props: SendMessageProps) => Promise<ChatCompleteResponse>;
}

// useChatComplete uses the same api as useSendMessage (post_actions_connector_execute) but without requiring conversationId/apiConfig
// it is meant to be used for one-off messages that don't require a conversation
export const useChatComplete = (): UseChatComplete => {
  const { alertsIndexPattern, http, traceOptions } = useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);
  const abortController = useRef(new AbortController());
  const sendMessage = useCallback(
    async ({ message, replacements }: SendMessageProps) => {
      setIsLoading(true);

      const timeoutId = setTimeout(() => {
        abortController.current.abort(FETCH_MESSAGE_TIMEOUT_ERROR);
        abortController.current = new AbortController();
      }, EXECUTE_ACTION_TIMEOUT);

      try {
        return await postChatComplete({
          alertsIndexPattern,
          http,
          message,
          replacements,
          signal: abortController.current.signal,
          traceOptions,
        });
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    },
    [alertsIndexPattern, http, traceOptions]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { isLoading, sendMessage, abortStream: cancelRequest };
};
