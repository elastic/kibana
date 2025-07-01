/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '@kbn/onechat-common';
import {
  ConversationRound,
  ToolCallStep,
  createEmptyConversation,
  isToolCallStep,
} from '@kbn/onechat-common/chat/conversation';
import { QueryClient, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import produce from 'immer';
import { queryKeys } from '../query_keys';
import { appPaths } from '../utils/app_paths';
import { useNavigation } from './use_navigation';
import { useOnechatServices } from './use_onechat_service';

const createActions = ({
  queryClient,
  queryKey,
  navigateToNewConversation,
}: {
  queryClient: QueryClient;
  queryKey: QueryKey;
  navigateToNewConversation: ({ newConversationId }: { newConversationId: string }) => void;
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
      queryClient.invalidateQueries({ queryKey });
    },
    addConversationRound: ({ userMessage }: { userMessage: string }) => {
      setConversation(
        produce((draft) => {
          const nextRound: ConversationRound = {
            userInput: { message: userMessage },
            assistantResponse: { message: '' },
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
          (s) => isToolCallStep(s) && s.toolCallId === toolCallId
        ) as ToolCallStep;
        if (step) {
          step.result = result;
        }
      });
    },
    setAssistantMessage: ({ assistantMessage }: { assistantMessage: string }) => {
      setCurrentRound((round) => {
        round.assistantResponse.message = assistantMessage;
      });
    },
    addAssistantMessageChunk: ({ messageChunk }: { messageChunk: string }) => {
      setCurrentRound((round) => {
        round.assistantResponse.message += messageChunk;
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
      navigateToNewConversation({ newConversationId: id });
    },
  };
};

export const useConversation = ({ conversationId }: { conversationId: string | undefined }) => {
  const { conversationsService } = useOnechatServices();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.conversations.byId(conversationId ?? 'new');
  const { data: conversation, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (conversationId) {
        return conversationsService.get({ conversationId });
      }
      return null;
    },
  });
  const { navigateToOnechatUrl } = useNavigation();

  return {
    conversation,
    isLoading,
    actions: createActions({
      queryClient,
      queryKey,
      navigateToNewConversation: ({ newConversationId }: { newConversationId: string }) => {
        navigateToOnechatUrl(appPaths.chat.conversation({ conversationId: newConversationId }));
      },
    }),
  };
};
