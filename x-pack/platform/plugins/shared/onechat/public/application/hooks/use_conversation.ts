/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Conversation,
  ConversationRound,
  ToolCallStep,
  createEmptyConversation,
  isToolCallStep,
  newConversationId,
} from '@kbn/onechat-common';
import { QueryClient, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import produce from 'immer';
import { queryKeys } from '../query_keys';
import { appPaths } from '../utils/app_paths';
import { useNavigation } from './use_navigation';
import { useOnechatServices } from './use_onechat_service';
import { useConversationId } from './use_conversation_id';

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
  return {
    invalidateConversation: () => {
      const [_, conversationId] = queryKey;
      if (conversationId === newConversationId) {
        // Purge the query cache since we never fetch for conversation id "new"
        queryClient.removeQueries({ queryKey });
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
    },
    addConversationRound: ({ userMessage }: { userMessage: string }) => {
      setConversation(
        produce((draft) => {
          const nextRound: ConversationRound = {
            input: { message: userMessage },
            response: { message: '' },
            steps: [],
          };
          if (!draft) {
            const nextConversation = createEmptyConversation();
            nextConversation.rounds.push(nextRound);
            return nextConversation;
          }
          draft.rounds.push(nextRound);
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
        const step = round.steps.find(
          (s) => isToolCallStep(s) && s.tool_call_id === toolCallId
        ) as ToolCallStep;
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
    onConversationUpdate: ({
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

  return {
    conversation,
    isLoading,
    actions: createActions({
      queryClient,
      queryKey,
      navigateToConversation: ({ nextConversationId }: { nextConversationId: string }) => {
        navigateToOnechatUrl(appPaths.chat.conversation({ conversationId: nextConversationId }));
      },
    }),
  };
};
