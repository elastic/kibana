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
  isConversationUpdatedEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isOnechatError,
  isToolCallEvent,
  isToolResultEvent,
} from '@kbn/onechat-common';
import { createToolCallStep } from '@kbn/onechat-common/chat/conversation';
import { useCallback, useState } from 'react';
import { useConversation } from './use_conversation';
import { useKibana } from './use_kibana';
import { useOnechatServices } from './use_onechat_service';

export type ChatStatus = 'ready' | 'loading' | 'error';

interface UseChatProps {
  conversationId: string | undefined;
  agentId: string;
  connectorId?: string;
  onError?: (error: OnechatError<OnechatErrorCode>) => void;
}

export const useChat = ({ conversationId, agentId, connectorId, onError }: UseChatProps) => {
  const { chatService } = useOnechatServices();
  const {
    services: { notifications },
  } = useKibana();
  const [status, setStatus] = useState<ChatStatus>('ready');
  const { actions } = useConversation({ conversationId });

  const sendMessage = useCallback(
    (nextMessage: string) => {
      if (status === 'loading') {
        return;
      }

      actions.addConversationRound({ userMessage: nextMessage });
      setStatus('loading');

      const events$ = chatService.chat({
        nextMessage,
        conversationId,
        agentId,
        connectorId,
      });

      events$.subscribe({
        next: (event) => {
          // chunk received, we append it to the chunk buffer
          if (isMessageChunkEvent(event)) {
            actions.addAssistantMessageChunk({ messageChunk: event.data.textChunk });
          }

          // full message received - we purge the chunk buffer
          // and insert the received message into the temporary list
          else if (isMessageCompleteEvent(event)) {
            actions.setAssistantMessage({ assistantMessage: event.data.messageContent });
          } else if (isToolCallEvent(event)) {
            const { toolCallId, toolId, args } = event.data;
            actions.addToolCall({
              step: createToolCallStep({
                args,
                result: '',
                toolCallId,
                toolId,
              }),
            });
          } else if (isToolResultEvent(event)) {
            const { toolCallId, result } = event.data;
            actions.setToolCallResult({ result, toolCallId });
          } else if (isConversationCreatedEvent(event) || isConversationUpdatedEvent(event)) {
            const { conversationId: id, title } = event.data;
            actions.onConversationUpdate({ conversationId: id, title });
          }
        },
        complete: () => {
          actions.invalidateConversation();
          setStatus('ready');
        },
        error: (err) => {
          actions.invalidateConversation();
          setStatus('error');
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
    },
    [chatService, notifications, status, agentId, conversationId, connectorId, onError, actions]
  );

  return {
    status,
    sendMessage,
  };
};
