/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { QueryClient } from '@kbn/react-query';
import produce from 'immer';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type {
  ConversationRound,
  ReasoningStep,
  ToolCallProgress,
  ToolCallStep,
  Conversation,
} from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import type { ConversationsService } from '../../../services/conversations';
import { queryKeys } from '../../query_keys';
import { storageKeys } from '../../storage_keys';
import { createNewConversation, newConversationId } from '../../utils/new_conversation';

const pendingRoundId = '__pending__';

export interface ConversationActions {
  removeNewConversationQuery: () => void;
  invalidateConversation: () => void;
  addOptimisticRound: ({ userMessage }: { userMessage: string }) => void;
  removeOptimisticRound: () => void;
  setAgentId: (agentId: string) => void;
  addReasoningStep: ({ step }: { step: ReasoningStep }) => void;
  addToolCall: ({ step }: { step: ToolCallStep }) => void;
  setToolCallProgress: ({
    progress,
    toolCallId,
  }: {
    progress: ToolCallProgress;
    toolCallId: string;
  }) => void;
  setToolCallResult: ({
    results,
    toolCallId,
  }: {
    results: ToolResult[];
    toolCallId: string;
  }) => void;
  setAssistantMessage: ({ assistantMessage }: { assistantMessage: string }) => void;
  addAssistantMessageChunk: ({ messageChunk }: { messageChunk: string }) => void;
  onConversationCreated: ({
    conversationId,
    title,
  }: {
    conversationId: string;
    title: string;
  }) => void;
  deleteConversation: (id: string) => Promise<void>;
}

interface UseConversationActionsParams {
  conversationId?: string;
  queryKey: string[];
  queryClient: QueryClient;
  conversationsService: ConversationsService;
  onConversationCreated?: (params: { conversationId: string; title: string }) => void;
  onDeleteConversation?: (params: { id: string; isCurrentConversation: boolean }) => void;
}

export const useConversationActions = ({
  conversationId,
  queryKey,
  queryClient,
  conversationsService,
  onConversationCreated,
  onDeleteConversation,
}: UseConversationActionsParams): ConversationActions => {
  const [, setAgentIdStorage] = useLocalStorage<string>(storageKeys.agentId);

  const setConversation = useCallback(
    (updater: (conversation?: Conversation) => Conversation) => {
      queryClient.setQueryData<Conversation>(queryKey, updater);
    },
    [queryClient, queryKey]
  );

  const setAgentId = useCallback(
    (agentId: string) => {
      // We allow to change agent only at the start of the conversation
      if (conversationId) {
        return;
      }
      setConversation(
        produce((draft) => {
          if (!draft) {
            const newConversation = createNewConversation();
            newConversation.agent_id = agentId;
            return newConversation;
          }

          draft.agent_id = agentId;
        })
      );
      setAgentIdStorage(agentId);
    },
    [conversationId, setConversation, setAgentIdStorage]
  );

  const setCurrentRound = useCallback(
    (updater: (conversationRound: ConversationRound) => void) => {
      setConversation(
        produce((draft) => {
          const round = draft?.rounds?.at(-1);
          if (round) {
            updater(round);
          }
        })
      );
    },
    [setConversation]
  );

  const removeNewConversationQuery = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(newConversationId) });
  }, [queryClient]);

  const invalidateConversation = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const addOptimisticRound = useCallback(
    ({ userMessage }: { userMessage: string }) => {
      setConversation(
        produce((draft) => {
          const nextRound: ConversationRound = {
            id: pendingRoundId,
            input: { message: userMessage },
            response: { message: '' },
            steps: [],
          };

          if (!draft) {
            const newConversation = createNewConversation();
            newConversation.rounds.push(nextRound);
            return newConversation;
          }

          draft.rounds.push(nextRound);
        })
      );
    },
    [setConversation]
  );

  const removeOptimisticRound = useCallback(() => {
    setConversation(
      produce((draft) => {
        draft?.rounds?.pop();
      })
    );
  }, [setConversation]);

  const addReasoningStep = useCallback(
    ({ step }: { step: ReasoningStep }) => {
      setCurrentRound((round) => {
        round.steps.push(step);
      });
    },
    [setCurrentRound]
  );

  const addToolCall = useCallback(
    ({ step }: { step: ToolCallStep }) => {
      setCurrentRound((round) => {
        round.steps.push(step);
      });
    },
    [setCurrentRound]
  );

  const setToolCallProgress = useCallback(
    ({ progress, toolCallId }: { progress: ToolCallProgress; toolCallId: string }) => {
      setCurrentRound((round) => {
        const step = round.steps.filter(isToolCallStep).find((s) => s.tool_call_id === toolCallId);
        if (step) {
          if (!step.progression) {
            step.progression = [];
          }
          step.progression.push(progress);
        }
      });
    },
    [setCurrentRound]
  );

  const setToolCallResult = useCallback(
    ({ results, toolCallId }: { results: ToolResult[]; toolCallId: string }) => {
      setCurrentRound((round) => {
        const step = round.steps.filter(isToolCallStep).find((s) => s.tool_call_id === toolCallId);
        if (step) {
          step.results = results;
        }
      });
    },
    [setCurrentRound]
  );

  const setAssistantMessage = useCallback(
    ({ assistantMessage }: { assistantMessage: string }) => {
      setCurrentRound((round) => {
        round.response.message = assistantMessage;
      });
    },
    [setCurrentRound]
  );

  const addAssistantMessageChunk = useCallback(
    ({ messageChunk }: { messageChunk: string }) => {
      setCurrentRound((round) => {
        round.response.message += messageChunk;
      });
    },
    [setCurrentRound]
  );

  const handleConversationCreated = useCallback(
    ({ conversationId: id, title }: { conversationId: string; title: string }) => {
      const current = queryClient.getQueryData<Conversation>(queryKey);
      if (!current) {
        throw new Error('Conversation not created');
      }

      // Update individual conversation cache (with rounds)
      queryClient.setQueryData<Conversation>(
        queryKeys.conversations.byId(id),
        produce(current, (draft) => {
          draft.id = id;
          draft.title = title;
        })
      );

      // Invalidate conversation list to get updated data from server
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

      // Call provider-specific callback if provided
      if (onConversationCreated) {
        onConversationCreated({ conversationId: id, title });
      }
    },
    [queryClient, queryKey, onConversationCreated]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
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
    [conversationsService, conversationId, queryClient, onDeleteConversation]
  );

  return {
    removeNewConversationQuery,
    invalidateConversation,
    addOptimisticRound,
    removeOptimisticRound,
    setAgentId,
    addReasoningStep,
    addToolCall,
    setToolCallProgress,
    setToolCallResult,
    setAssistantMessage,
    addAssistantMessageChunk,
    onConversationCreated: handleConversationCreated,
    deleteConversation: handleDeleteConversation,
  };
};
