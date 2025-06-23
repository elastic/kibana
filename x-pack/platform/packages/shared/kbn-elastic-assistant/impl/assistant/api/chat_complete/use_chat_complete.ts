/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { PromptIds, Replacements } from '@kbn/elastic-assistant-common';
import { HttpFetchQuery } from '@kbn/core-http-browser';
import { ChatCompleteResponse, postChatComplete } from './post_chat_complete';
import { useAssistantContext, useLoadConnectors } from '../../../..';

interface SendMessageProps {
  message: string;
  promptIds?: PromptIds;
  replacements: Replacements;
  query?: HttpFetchQuery;
}
interface UseChatComplete {
  abortStream: () => void;
  isLoading: boolean;
  sendMessage: (props: SendMessageProps) => Promise<ChatCompleteResponse>;
}

// useChatComplete uses the same api as useSendMessage (post_actions_connector_execute) but without requiring conversationId/apiConfig
// it is meant to be used for one-off messages that don't require a conversation
export const useChatComplete = ({ connectorId }: { connectorId: string }): UseChatComplete => {
  const { alertsIndexPattern, http, traceOptions } = useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);
  const abortController = useRef(new AbortController());
  const { data: connectors } = useLoadConnectors({ http, inferenceEnabled: true });
  const actionTypeId = useMemo(
    () => connectors?.find(({ id }) => id === connectorId)?.actionTypeId ?? '.gen-ai',
    [connectors, connectorId]
  );
  const sendMessage = useCallback(
    async ({ message, promptIds, replacements, query }: SendMessageProps) => {
      setIsLoading(true);

      try {
        return await postChatComplete({
          actionTypeId,
          alertsIndexPattern,
          connectorId,
          http,
          message,
          promptIds,
          replacements,
          query,
          signal: abortController.current.signal,
          traceOptions,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [actionTypeId, alertsIndexPattern, connectorId, http, traceOptions]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { isLoading, sendMessage, abortStream: cancelRequest };
};
