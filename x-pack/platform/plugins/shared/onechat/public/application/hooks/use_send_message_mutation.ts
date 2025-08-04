/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isConversationCreatedEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isOnechatError,
  isRequestAbortedError,
  isRoundCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
} from '@kbn/onechat-common';
import { createToolCallStep } from '@kbn/onechat-common/chat/conversation';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { mutationKeys } from '../mutation_keys';
import { useConversation } from './use_conversation';
import { useOnechatServices } from './use_onechat_service';
import { useReportConverseError } from './use_report_error';

interface UseSendMessageMutationProps {
  connectorId?: string;
}

const showError = (error: unknown) => {
  // TODO: Should unknown errors have alternative handling?
  // We shouldn't let them fail silently, so show them
  if (!isOnechatError(error)) {
    return true;
  }

  // If the user manually aborts the request, we don't want to show an error
  if (isRequestAbortedError(error)) {
    return false;
  }

  // All other OneChat errors should be shown
  return true;
};

export const useSendMessageMutation = ({ connectorId }: UseSendMessageMutationProps = {}) => {
  const { chatService } = useOnechatServices();
  const { reportConverseError } = useReportConverseError();
  const { actions, conversationId, conversation } = useConversation();
  const { agent_id: agentId } = conversation ?? {};
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const sendMessage = ({ message }: { message: string }) => {
    return new Promise<void>((resolve, reject) => {
      const events$ = chatService.chat({
        input: message,
        conversationId,
        agentId,
        connectorId,
      });

      events$.subscribe({
        next: (event) => {
          // chunk received, we append it to the chunk buffer
          if (isMessageChunkEvent(event)) {
            actions.addAssistantMessageChunk({ messageChunk: event.data.text_chunk });
          }
          // full message received, override chunk buffer
          else if (isMessageCompleteEvent(event)) {
            actions.setAssistantMessage({ assistantMessage: event.data.message_content });
          } else if (isToolCallEvent(event)) {
            actions.addToolCall({
              step: createToolCallStep({
                params: event.data.params,
                results: [],
                tool_call_id: event.data.tool_call_id,
                tool_id: event.data.tool_id,
              }),
            });
          } else if (isToolResultEvent(event)) {
            const { tool_call_id: toolCallId, results } = event.data;
            actions.setToolCallResult({ results, toolCallId });
          } else if (isRoundCompleteEvent(event)) {
            // Now we have the full response and can stop the loading indicators
            setIsResponseLoading(false);
          } else if (isConversationCreatedEvent(event)) {
            const { conversation_id: id, title } = event.data;
            actions.onConversationCreated({ conversationId: id, title });
          }
        },
        complete: () => {
          resolve();
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  };

  const { mutate, error } = useMutation({
    mutationKey: mutationKeys.sendMessage,
    mutationFn: sendMessage,
    onMutate: ({ message }) => {
      setPendingMessage(message);

      // Batch state changes to prevent multiple renders in legacy React
      // This prevents loading indicator flickering in new round
      unstable_batchedUpdates(() => {
        actions.addConversationRound({ userMessage: message });
        setIsResponseLoading(true);
      });
    },
    onSettled: () => {
      actions.invalidateConversation();
    },
    onSuccess: () => {
      setPendingMessage(null);
    },
    onError: (err) => {
      setIsResponseLoading(false);
      reportConverseError(err, { conversationId, agentId, connectorId });
    },
  });

  return {
    sendMessage: mutate,
    isResponseLoading,
    error: showError(error) && error,
    pendingMessage,
    retry: () => {
      if (
        // Retrying should not be allowed if a response is still being fetched
        // or if we're not in an error state
        isResponseLoading ||
        !error
      ) {
        return;
      }

      if (!pendingMessage) {
        // Should never happen
        // If we are in an error state, pending message will be present
        throw new Error('Pending message is not present');
      }

      mutate({ message: pendingMessage });
    },
  };
};
