/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation, ConversationRound, ToolCallStep, isToolCallStep } from '@kbn/onechat-common';
import { QueryClient, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import produce from 'immer';
import { useEffect, useMemo } from 'react';
import { queryKeys } from '../query_keys';
import { appPaths } from '../utils/app_paths';
import { useNavigation } from './use_navigation';
import { useOnechatServices } from './use_onechat_service';
import { useConversationId } from './use_conversation_id';
import { createNewConversation, newConversationId } from '../utils/new_conversation';

const createActions = ({
  queryClient,
  queryKey,
  navigateToConversation,
}: {
  queryClient: QueryClient;
  queryKey: QueryKey;
  navigateToConversation: ({ nextConversationId }: { nextConversationId: string }) => void;
}) => {
  const setConversation = (updater: (conversation?: Conversation) => Conversation) => {
    queryClient.setQueryData<Conversation>(queryKey, updater);
  };
  const setCurrentRound = (updater: (conversationRound: ConversationRound) => void) => {
    setConversation(
      produce((draft) => {
        const round = draft?.rounds?.at(-1);
        if (round) {
          updater(round);
        }
      })
    );
  };
  const [_, conversationId] = queryKey;
  const isNewConversation = conversationId === newConversationId;
  return {
    invalidateConversation: () => {
      if (isNewConversation) {
        // Purge the query cache since we never fetch for conversation id "new"
        queryClient.removeQueries({ queryKey });
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
    },
    addConversation: () => {
      setConversation(() => createNewConversation());
    },
    addConversationRound: ({ userMessage }: { userMessage: string }) => {
      setConversation(
        produce((draft) => {
          const nextRound: ConversationRound = {
            input: { message: userMessage },
            response: { message: '' },
            steps: [],
          };
          draft?.rounds?.push(nextRound);
        })
      );
    },
    setAgentId: (agentId: string) => {
      // We allow to change agent only at the start of the conversation
      if (!isNewConversation) {
        return;
      }
      setConversation(
        produce((draft) => {
          if (draft) {
            draft.agentId = agentId;
          }
        })
      );
    },
    addToolCall: ({ step }: { step: ToolCallStep }) => {
      setCurrentRound((round) => {
        round.steps.push(step);
      });
    },
    setToolCallResult: ({ result, toolCallId }: { result: string; toolCallId: string }) => {
      setCurrentRound((round) => {
        const step = round.steps.filter(isToolCallStep).find((s) => s.tool_call_id === toolCallId);
        if (step) {
          step.result = result;
        }
      });
    },
    setAssistantMessage: ({ assistantMessage }: { assistantMessage: string }) => {
      setCurrentRound((round) => {
        round.response.message = assistantMessage;
      });
    },
    addAssistantMessageChunk: ({ messageChunk }: { messageChunk: string }) => {
      setCurrentRound((round) => {
        round.response.message += messageChunk;
      });
    },
    onConversationCreated: ({
      conversationId: id,
      title,
    }: {
      conversationId: string;
      title: string;
    }) => {
      const current = queryClient.getQueryData<Conversation>(queryKey);
      if (current) {
        queryClient.setQueryData<Conversation>(
          queryKeys.conversations.byId(id),
          produce(current, (draft) => {
            draft.id = id;
            draft.title = title;
          })
        );
      }
      navigateToConversation({ nextConversationId: id });
    },
  };
};

export const useConversation = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useOnechatServices();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);
  const { data: conversation, isLoading } = useQuery({
    queryKey,
    enabled: Boolean(conversationId),
    queryFn: () => {
      if (!conversationId) {
        return Promise.reject(new Error('Invalid conversation id'));
      }
      return conversationsService.get({ conversationId });
    },
  });
  const { navigateToOnechatUrl } = useNavigation();

  const actions = useMemo(
    () =>
      createActions({
        queryClient,
        queryKey,
        navigateToConversation: ({ nextConversationId }: { nextConversationId: string }) => {
          navigateToOnechatUrl(appPaths.chat.conversation({ conversationId: nextConversationId }));
        },
      }),
    [queryClient, queryKey, navigateToOnechatUrl]
  );

  useEffect(() => {
    if (!conversationId && !conversation) {
      actions.addConversation();
    }
  }, [conversationId, actions, conversation]);

  return {
    conversation,
    conversationId,
    hasActiveConversation: Boolean(
      conversationId || (conversation && conversation.rounds.length > 0)
    ),
    isLoading,
    actions,
  };
};
