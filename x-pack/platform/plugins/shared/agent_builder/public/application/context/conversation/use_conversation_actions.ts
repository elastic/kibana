/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { QueryClient } from '@kbn/react-query';
import produce, { type Draft } from 'immer-v9';
import type { ConversationRound, Conversation } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import {
  createAskUserQuestionStep,
  isAskUserQuestionStep,
} from '@kbn/agent-builder-common/chat/conversation';
import type { PromptResponse } from '@kbn/agent-builder-common/agents';
import {
  isAskUserQuestionPrompt,
  isAskUserQuestionPromptResponse,
} from '@kbn/agent-builder-common/agents';
import type { ConversationsService } from '../../../services/conversations';
import { queryKeys } from '../../query_keys';

export interface ConversationActions {
  invalidateConversation: () => void;
  onExecutionStarted: () => void;
  onExecutionTerminated: () => void;
  refetchConversation: () => Promise<Conversation>;
  clearPendingPrompts: () => void;
  setAskUserQuestionAnswers: (prompts: Record<string, PromptResponse>) => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
}

interface UseConversationActionsParams {
  conversationId?: string;
  queryClient: QueryClient;
  conversationsService: ConversationsService;
  onDeleteConversation?: (params: { id: string; isCurrentConversation: boolean }) => void;
}

export const createConversationActions = ({
  conversationId,
  queryClient,
  conversationsService,
  onDeleteConversation,
}: UseConversationActionsParams): ConversationActions => {
  const queryKey = queryKeys.conversations.byId(conversationId ?? '');
  const setConversation = (updater: (conversation?: Conversation) => Conversation) => {
    queryClient.setQueryData<Conversation>(queryKey, updater);
  };
  const setCurrentRound = (updater: (conversationRound: Draft<ConversationRound>) => void) => {
    setConversation(
      produce((draft) => {
        const round = draft?.rounds?.at(-1);
        if (round) {
          updater(round);
        }
      })
    );
  };

  // `fetchQuery` rather than `invalidateQueries`: it fetches whether or not an observer is mounted
  // and resolves with the response, which the completion release needs.
  const fetchConversation = () => {
    if (!conversationId) {
      return Promise.reject(new Error('Invalid conversation id'));
    }
    return queryClient.fetchQuery({
      queryKey,
      queryFn: () => conversationsService.get({ conversationId }),
    });
  };
  const refreshConversationList = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
  };

  return {
    invalidateConversation: () => {
      queryClient.invalidateQueries({ queryKey });
    },

    onExecutionStarted: () => {
      refreshConversationList();
    },

    onExecutionTerminated: () => {
      refreshConversationList();
    },

    // A request already in flight was sent before the execution was persisted and would be
    // returned by `fetchQuery` as-is; cancel it so the response reflects the completed execution.
    refetchConversation: () => queryClient.cancelQueries({ queryKey }).then(fetchConversation),

    clearPendingPrompts: () => {
      setCurrentRound((round) => {
        round.pending_prompts = undefined;
        round.status = ConversationRoundStatus.inProgress;
      });
    },
    setAskUserQuestionAnswers: (prompts: Record<string, PromptResponse>) => {
      setCurrentRound((round) => {
        for (const [promptId, response] of Object.entries(prompts)) {
          if (!isAskUserQuestionPromptResponse(response)) continue;
          const existing = round.steps.find(
            (s) => isAskUserQuestionStep(s) && s.prompt_id === promptId
          );
          if (existing && isAskUserQuestionStep(existing)) {
            existing.answers = response.answers;
          } else {
            const pendingPrompt = round.pending_prompts?.find(
              (p) => isAskUserQuestionPrompt(p) && p.id === promptId
            );
            if (pendingPrompt && isAskUserQuestionPrompt(pendingPrompt)) {
              round.steps.push(
                createAskUserQuestionStep({
                  prompt_id: promptId,
                  questions: pendingPrompt.questions,
                  answers: response.answers,
                })
              );
            }
          }
        }
      });
    },
    deleteConversation: async (id: string) => {
      await conversationsService.delete({ conversationId: id });

      // Check if we're deleting the current conversation
      const isCurrentConversation = conversationId === id;

      queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

      // Call provider-specific callback if provided
      if (onDeleteConversation) {
        onDeleteConversation({ id, isCurrentConversation });
      }
    },
    renameConversation: async (id: string, title: string) => {
      await conversationsService.rename({ conversationId: id, title });

      // Update the conversation in cache if it exists
      const conversationQueryKey = queryKeys.conversations.byId(id);
      const currentConversation = queryClient.getQueryData<Conversation>(conversationQueryKey);
      if (currentConversation) {
        queryClient.setQueryData<Conversation>(
          conversationQueryKey,
          produce(currentConversation, (draft) => {
            draft.title = title;
          })
        );
      }

      // Invalidate conversation list to get updated data from server
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  };
};

export const useConversationActions = ({
  conversationId,
  queryClient,
  conversationsService,
  onDeleteConversation,
}: UseConversationActionsParams): ConversationActions => {
  const conversationActions = useMemo(
    () =>
      createConversationActions({
        conversationId,
        queryClient,
        conversationsService,
        onDeleteConversation,
      }),
    [conversationId, queryClient, conversationsService, onDeleteConversation]
  );

  return conversationActions;
};
