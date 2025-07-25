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
  connectorId?: string;
  onError?: (error: OnechatError<OnechatErrorCode>) => void;
}

export const useChat = ({ connectorId, onError }: UseChatProps = {}) => {
  const { chatService } = useOnechatServices();
  const {
    services: { notifications },
  } = useKibana();
  const [status, setStatus] = useState<ChatStatus>('ready');
  const { actions, conversationId, conversation } = useConversation();
  const { agent_id: agentId } = conversation ?? {};

  const sendMessage = useCallback(
    (nextMessage: string) => {
      if (status === 'loading') {
        return;
      }

      actions.addConversationRound({ userMessage: nextMessage });
      setStatus('loading');

      const events$ = chatService.chat({
        input: nextMessage,
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

          // full message received - we purge the chunk buffer
          // and insert the received message into the temporary list
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
          } else if (isConversationCreatedEvent(event)) {
            const { conversation_id: id, title } = event.data;
            actions.onConversationCreated({ conversationId: id, title });
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
