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
  isRoundCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
} from '@kbn/onechat-common';
import { createToolCallStep } from '@kbn/onechat-common/chat/conversation';
import { useMutation } from '@tanstack/react-query';
import React, { createContext, useContext, useRef, useState } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useAgentId } from '../hooks/use_conversation';
import { useConversationActions } from '../hooks/use_conversation_actions';
import { useConversationId } from '../hooks/use_conversation_id';
import { useOnechatServices } from '../hooks/use_onechat_service';
import { useReportConverseError } from '../hooks/use_report_error';
import { mutationKeys } from '../mutation_keys';
interface UseSendMessageMutationProps {
  connectorId?: string;
}

const useSendMessageMutation = ({ connectorId }: UseSendMessageMutationProps = {}) => {
  const { chatService } = useOnechatServices();
  const { reportConverseError } = useReportConverseError();
  const conversationActions = useConversationActions();
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const conversationId = useConversationId();
  const agentId = useAgentId();
  const messageControllerRef = useRef<AbortController | null>(null);

  const sendMessage = ({ message }: { message: string }) => {
    return new Promise<void>((resolve, reject) => {
      const signal = messageControllerRef.current?.signal;
      if (!signal) {
        reject(new Error('Abort signal not present'));
        return;
      }
      const events$ = chatService.chat({
        signal,
        input: message,
        conversationId,
        agentId,
        connectorId,
      });

      events$.subscribe({
        next: (event) => {
          // chunk received, we append it to the chunk buffer
          if (isMessageChunkEvent(event)) {
            conversationActions.addAssistantMessageChunk({ messageChunk: event.data.text_chunk });
          }
          // full message received, override chunk buffer
          else if (isMessageCompleteEvent(event)) {
            conversationActions.setAssistantMessage({
              assistantMessage: event.data.message_content,
            });
          } else if (isToolCallEvent(event)) {
            conversationActions.addToolCall({
              step: createToolCallStep({
                params: event.data.params,
                results: [],
                tool_call_id: event.data.tool_call_id,
                tool_id: event.data.tool_id,
              }),
            });
          } else if (isToolResultEvent(event)) {
            const { tool_call_id: toolCallId, results } = event.data;
            conversationActions.setToolCallResult({ results, toolCallId });
          } else if (isRoundCompleteEvent(event)) {
            // Now we have the full response and can stop the loading indicators
            setIsResponseLoading(false);
          } else if (isConversationCreatedEvent(event)) {
            const { conversation_id: id, title } = event.data;
            conversationActions.onConversationCreated({ conversationId: id, title });
          }
        },
        complete: () => {
          resolve();
        },
        error: (err) => {
          // If the request is aborted, we don't want to show an error
          if (messageControllerRef.current?.signal?.aborted) {
            setIsResponseLoading(false);
            resolve();
            return;
          }
          reject(err);
        },
      });
    });
  };

  const { mutate, error, isLoading } = useMutation({
    mutationKey: mutationKeys.sendMessage,
    mutationFn: sendMessage,
    onMutate: ({ message }) => {
      setPendingMessage(message);
      messageControllerRef.current = new AbortController();

      // Batch state changes to prevent multiple renders in legacy React
      // This prevents loading indicator flickering in new round
      unstable_batchedUpdates(() => {
        conversationActions.addConversationRound({ userMessage: message });
        setIsResponseLoading(true);
      });
    },
    onSettled: () => {
      conversationActions.invalidateConversation();
      messageControllerRef.current = null;
    },
    onSuccess: () => {
      setPendingMessage(null);
    },
    onError: (err) => {
      setIsResponseLoading(false);
      reportConverseError(err, { connectorId });
    },
  });

  const canCancel = isLoading;
  const cancel = () => {
    if (!canCancel) {
      return;
    }
    setPendingMessage(null);
    messageControllerRef.current?.abort();
  };

  return {
    sendMessage: mutate,
    isResponseLoading,
    error,
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
    canCancel,
    cancel,
  };
};

interface MessagesState {
  input: string;
  setInput: (input: string) => void;
  sendMessage: ({ message }: { message: string }) => void;
  isResponseLoading: boolean;
  error: unknown;
  pendingMessage: string | null;
  retry: () => void;
  canCancel: boolean;
  cancel: () => void;
}

const MessagesContext = createContext<MessagesState | null>(null);

export const MessagesProvider = ({ children }: { children: React.ReactNode }) => {
  const [input, setInput] = useState('');
  const { sendMessage, isResponseLoading, error, pendingMessage, retry, canCancel, cancel } =
    useSendMessageMutation();

  const handleCancel = () => {
    if (pendingMessage) {
      setInput(pendingMessage);
    }
    cancel();
  };

  return (
    <MessagesContext.Provider
      value={{
        input,
        setInput,
        sendMessage,
        isResponseLoading,
        error,
        pendingMessage,
        retry,
        canCancel,
        cancel: handleCancel,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
};
