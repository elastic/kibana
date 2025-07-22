/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  OnechatError,
  OnechatErrorCode,
  isConversationCreatedEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isOnechatError,
  isRoundCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
} from '@kbn/onechat-common';
import { createToolCallStep } from '@kbn/onechat-common/chat/conversation';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useConversation } from './use_conversation';
import { useKibana } from './use_kibana';
import { useOnechatServices } from './use_onechat_service';

interface UseSendMessageMutationProps {
  connectorId?: string;
  onError?: (error: OnechatError<OnechatErrorCode>) => void;
}

export const useSendMessageMutation = ({
  connectorId,
  onError,
}: UseSendMessageMutationProps = {}) => {
  const { chatService } = useOnechatServices();
  const {
    services: { notifications },
  } = useKibana();
  const { actions, conversationId, conversation } = useConversation();
  const { agent_id: agentId } = conversation ?? {};
  const [isResponseLoading, setIsResponseLoading] = useState(false);

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
                result: '',
                tool_call_id: event.data.tool_call_id,
                tool_id: event.data.tool_id,
              }),
            });
          } else if (isToolResultEvent(event)) {
            const { tool_call_id: toolCallId, result } = event.data;
            actions.setToolCallResult({ result, toolCallId });
          } else if (isRoundCompleteEvent(event)) {
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

  const { mutate, isError, error } = useMutation({
    mutationFn: sendMessage,
    onMutate: ({ message }) => {
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
    onError: (err: unknown) => {
      if (isOnechatError(err)) {
        onError?.(err);

        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.onechat.chat.chatError.title', {
            defaultMessage: 'Error loading chat response',
          }),
          toastMessage: `${err.code} - ${err.message}`,
        });
      }
    },
  });

  return {
    sendMessage: mutate,
    isResponseLoading,
    isResponseError: isError,
    responseError: error,
  };
};
