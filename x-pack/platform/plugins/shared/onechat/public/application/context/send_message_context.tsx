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
  isReasoningEvent,
  isRoundCompleteEvent,
  isToolCallEvent,
  isToolProgressEvent,
  isToolResultEvent,
} from '@kbn/onechat-common';
import { createReasoningStep, createToolCallStep } from '@kbn/onechat-common/chat/conversation';
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

// TODO: remove
let eventTimings: { eventMessage: string; timestamp: string }[] = [];

const useSendMessageMutation = ({ connectorId }: UseSendMessageMutationProps = {}) => {
  const { chatService } = useOnechatServices();
  const { reportConverseError } = useReportConverseError();
  const conversationActions = useConversationActions();
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [agentReasoning, setAgentReasoning] = useState<string | null>(null);
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
            // Track event count and timing
            const timestamp = new Date().toISOString();
            eventTimings.push({ eventMessage: event.data.text_chunk, timestamp });
            conversationActions.addAssistantMessageChunk({ messageChunk: event.data.text_chunk });
          }
          // full message received, override chunk buffer
          else if (isMessageCompleteEvent(event)) {
            conversationActions.setAssistantMessage({
              assistantMessage: event.data.message_content,
            });
          } else if (isToolProgressEvent(event)) {
            conversationActions.setToolCallProgress({
              progress: { message: event.data.message },
              toolCallId: event.data.tool_call_id,
            });
            // Individual tool progression message should also be displayed as reasoning
            setAgentReasoning(event.data.message);
          } else if (isReasoningEvent(event)) {
            conversationActions.addReasoningStep({
              step: createReasoningStep({
                reasoning: event.data.reasoning,
              }),
            });
            setAgentReasoning(event.data.reasoning);
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
            // eslint-disable-next-line no-console
            console.log(`Round Complete - Total Events Received: ${eventTimings.length}`);
            // eslint-disable-next-line no-console
            console.log('Event Timings:', eventTimings);

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
      // Reset event tracking for new message
      eventTimings = [];

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
      setAgentReasoning(null);
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
    agentReasoning,
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

interface SendMessageState {
  sendMessage: ({ message }: { message: string }) => void;
  isResponseLoading: boolean;
  error: unknown;
  pendingMessage: string | null;
  agentReasoning: string | null;
  retry: () => void;
  canCancel: boolean;
  cancel: () => void;
}

const SendMessageContext = createContext<SendMessageState | null>(null);

export const SendMessageProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    sendMessage,
    isResponseLoading,
    error,
    pendingMessage,
    agentReasoning,
    retry,
    canCancel,
    cancel,
  } = useSendMessageMutation();

  return (
    <SendMessageContext.Provider
      value={{
        sendMessage,
        isResponseLoading,
        error,
        pendingMessage,
        agentReasoning,
        retry,
        canCancel,
        cancel,
      }}
    >
      {children}
    </SendMessageContext.Provider>
  );
};

export const useSendMessage = () => {
  const context = useContext(SendMessageContext);
  if (!context) {
    throw new Error('useSendMessage must be used within a SendMessageProvider');
  }
  return context;
};
