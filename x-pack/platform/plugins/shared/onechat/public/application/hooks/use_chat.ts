/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChatAgentEventType, ChatEventType, Conversation } from '@kbn/onechat-common';
import { useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';
import { useCallback, useMemo, useState } from 'react';
import { ConversationRound, createEmptyConversation } from '@kbn/onechat-common/chat/conversation';
import type { ConversationCreatedEvent, ProgressionEvent } from '../../../common/chat_events';
import {
  createAssistantMessage,
  createToolCall,
  createToolResult,
  type ConversationEvent,
} from '../../../common/conversation_events';
import type { ChatError } from '../../../common/errors';
import { queryKeys } from '../query_keys';
import { useKibana } from './use_kibana';
import { useOneChatServices } from './use_onechat_service';

interface UseChatProps {
  conversationId: string | undefined;
  agentId: string;
  connectorId?: string;
  onConversationUpdate: (changes: ConversationCreatedEvent['conversation']) => void;
  onError?: (error: ChatError) => void;
}

export type ChatStatus = 'ready' | 'loading' | 'error';

export const useChat = ({
  conversationId,
  agentId,
  connectorId,
  onConversationUpdate,
  onError,
}: UseChatProps) => {
  const { chatService } = useOneChatServices();
  const {
    services: { notifications },
  } = useKibana();
  const [conversationEvents, setConversationEvents] = useState<ConversationEvent[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ConversationEvent[]>([]);
  const [progressionEvents, setProgressionEvents] = useState<ProgressionEvent[]>([]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const queryClient = useQueryClient();

  const conversationQueryKey = useMemo(
    () => queryKeys.conversations.byId(conversationId ?? 'new'),
    [conversationId]
  );

  const invalidateConversation = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: conversationQueryKey,
    });
  }, [queryClient, conversationQueryKey]);

  const addConversation = useCallback(
    ({ userMessage }: { userMessage: string }) => {
      queryClient.setQueryData<Conversation>(
        conversationQueryKey,
        produce((draft) => {
          const nextRound: ConversationRound = {
            userInput: { message: userMessage },
            assistantResponse: { message: '' },
            steps: [],
          };
          if (!draft) {
            const conversation = createEmptyConversation();
            conversation.rounds.push(nextRound);
            return conversation;
          }
          draft.rounds.push(nextRound);
        })
      );
    },
    [conversationQueryKey, queryClient]
  );

  const updateConversation = useCallback(
    ({ assistantMessage }: { assistantMessage: string }) => {
      queryClient.setQueryData<Conversation>(
        conversationQueryKey,
        produce((draft) => {
          const round = draft?.rounds?.at(-1);
          if (round) {
            round.assistantResponse.message = assistantMessage;
          }
        })
      );
    },
    [conversationQueryKey, queryClient]
  );

  const sendMessage = useCallback(
    (nextMessage: string) => {
      if (status === 'loading') {
        return;
      }

      addConversation({ userMessage: nextMessage });
      setStatus('loading');

      const events$ = chatService.chat({
        nextMessage,
        conversationId,
        agentId,
        connectorId,
      });

      const streamMessages: ConversationEvent[] = [];

      let concatenatedChunks = '';

      const getAllStreamMessages = () => {
        return streamMessages.concat(
          concatenatedChunks.length ? [createAssistantMessage({ content: concatenatedChunks })] : []
        );
      };

      events$.subscribe({
        next: (event) => {
          // chunk received, we append it to the chunk buffer
          if (event.type === ChatAgentEventType.messageChunk) {
            concatenatedChunks += event.data.textChunk;
            updateConversation({ assistantMessage: concatenatedChunks });
          }

          // full message received - we purge the chunk buffer
          // and insert the received message into the temporary list
          if (event.type === ChatAgentEventType.messageComplete) {
            concatenatedChunks = '';
            updateConversation({ assistantMessage: event.data.messageContent });
          }
          if (event.type === ChatAgentEventType.toolCall) {
            const { toolCallId, toolId, args } = event.data;
            streamMessages.push(
              createToolCall({
                toolCallId,
                toolName: toolId.toolId,
                args,
              })
            );
            setPendingMessages(getAllStreamMessages());
          }
          if (event.type === ChatAgentEventType.toolResult) {
            concatenatedChunks = '';
            const { toolCallId, result } = event.data;
            streamMessages.push(createToolResult({ toolCallId, toolResult: result }));
            setPendingMessages(getAllStreamMessages());
          }

          if (
            event.type === ChatEventType.conversationCreated ||
            event.type === ChatEventType.conversationUpdated
          ) {
            const { conversationId: id, title } = event.data;
            const conversation = queryClient.getQueryData<Conversation>(conversationQueryKey);
            // Update query data for the new conversation id
            if (conversation) {
              queryClient.setQueryData<Conversation>(
                queryKeys.conversations.byId(id),
                produce(conversation, (draft) => {
                  draft.id = id;
                  draft.title = title;
                })
              );
            }
            onConversationUpdate({ id, title });
          }
        },
        complete: () => {
          invalidateConversation();
          setPendingMessages([]);
          setProgressionEvents([]);
          setConversationEvents((prevEvents) => [...prevEvents, ...streamMessages]);
          setStatus('ready');
        },
        error: (err) => {
          invalidateConversation();
          setPendingMessages([]);
          setProgressionEvents([]);
          setConversationEvents((prevEvents) => [...prevEvents, ...streamMessages]);
          setStatus('error');
          onError?.(err);

          notifications.toasts.addError(err, {
            title: i18n.translate('xpack.onechat.chat.chatError.title', {
              defaultMessage: 'Error loading chat response',
            }),
            toastMessage: `${err.code} - ${err.message}`,
          });
        },
      });
    },
    [
      chatService,
      notifications,
      status,
      agentId,
      conversationId,
      connectorId,
      onConversationUpdate,
      onError,
      invalidateConversation,
      addConversation,
      updateConversation,
      conversationQueryKey,
      queryClient,
    ]
  );

  const setConversationEventsExternal = useCallback((newEvents: ConversationEvent[]) => {
    // TODO: unsub from observable + set status ready
    setConversationEvents(newEvents);
    setProgressionEvents([]);
    setPendingMessages([]);
  }, []);

  const allEvents = useMemo(() => {
    return [...conversationEvents, ...pendingMessages];
  }, [conversationEvents, pendingMessages]);

  return {
    status,
    sendMessage,
    conversationEvents: allEvents,
    progressionEvents,
    setConversationEvents: setConversationEventsExternal,
  };
};
