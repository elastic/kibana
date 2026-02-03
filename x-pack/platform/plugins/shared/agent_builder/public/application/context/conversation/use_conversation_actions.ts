/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { QueryClient } from '@kbn/react-query';
import produce from 'immer';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type {
  ConversationRound,
  ReasoningStep,
  ToolCallProgress,
  ToolCallStep,
  Conversation,
} from '@kbn/agent-builder-common';
import { isToolCallStep, ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentInput, Attachment } from '@kbn/agent-builder-common/attachments';
import type { ConversationsService } from '../../../services/conversations';
import { queryKeys } from '../../query_keys';
import { storageKeys } from '../../storage_keys';
import {
  createNewConversation,
  createNewRound,
  newConversationId,
} from '../../utils/new_conversation';

export interface ConversationActions {
  removeNewConversationQuery: () => void;
  invalidateConversation: () => void;
  addOptimisticRound: ({
    userMessage,
    attachments,
  }: {
    userMessage: string;
    attachments?: AttachmentInput[];
  }) => void;
  removeOptimisticRound: () => void;
  /**
   * Fetches the conversation from the server to get the cleared round.
   * Called when resending - the backend has already persisted an empty round.
   */
  clearLastRoundResponse: () => Promise<void>;
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
  setTimeToFirstToken: ({ timeToFirstToken }: { timeToFirstToken: number }) => void;
  setPendingPrompt: ({ prompt }: { prompt: PromptRequest }) => void;
  clearPendingPrompt: () => void;
  onConversationCreated: ({
    conversationId,
    title,
  }: {
    conversationId: string;
    title: string;
  }) => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
}

interface UseConversationActionsParams {
  conversationId?: string;
  queryClient: QueryClient;
  conversationsService: ConversationsService;
  onConversationCreated?: (params: { conversationId: string; title: string }) => void;
  onDeleteConversation?: (params: { id: string; isCurrentConversation: boolean }) => void;
}

interface CreateConversationActionsParams extends UseConversationActionsParams {
  setAgentIdStorage: (value: string) => void;
}

const createConversationActions = ({
  conversationId,
  queryClient,
  setAgentIdStorage,
  conversationsService,
  onConversationCreated,
  onDeleteConversation,
}: CreateConversationActionsParams): ConversationActions => {
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);
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
    removeNewConversationQuery: () => {
      queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(newConversationId) });
    },
    invalidateConversation: () => {
      queryClient.invalidateQueries({ queryKey });
    },

    addOptimisticRound: ({
      userMessage,
      attachments,
    }: {
      userMessage: string;
      attachments?: AttachmentInput[];
    }) => {
      setConversation(
        produce((draft) => {
          const optimisticAttachments: Attachment[] =
            attachments?.map((attachment, idx) => ({
              id: `pending-attachment-${idx}`,
              ...attachment,
            })) ?? [];

          const nextRound = createNewRound({ userMessage, attachments: optimisticAttachments });

          if (!draft) {
            const newConversation = createNewConversation();
            newConversation.rounds.push(nextRound);
            return newConversation;
          }

          draft.rounds.push(nextRound);
        })
      );
    },
    removeOptimisticRound: () => {
      setConversation(
        produce((draft) => {
          draft?.rounds?.pop();
        })
      );
    },
    /**
     * Fetches the conversation from the server to get the cleared round.
     * Uses fetchQuery which bypasses the query's `enabled` state entirely.
     */
    clearLastRoundResponse: async () => {
      if (!conversationId) {
        // eslint-disable-next-line no-console
        console.log('[clearLastRoundResponse] No conversationId, skipping fetch');
        return;
      }
      // eslint-disable-next-line no-console
      console.log('[clearLastRoundResponse] Starting:', {
        queryKey: JSON.stringify(queryKey),
        conversationId,
      });

      try {
        // Synchronously clear local state BEFORE the async fetch
        // This ensures streaming chunks append to empty string, not old message
        // Get current state before clearing for logging
        const currentData = queryClient.getQueryData<Conversation>(queryKey);
        const currentRound = currentData?.rounds?.at(-1);
        // eslint-disable-next-line no-console
        console.log('[clearLastRoundResponse] Before clear:', {
          messageLength: currentRound?.response?.message?.length ?? 0,
          stepsCount: currentRound?.steps?.length ?? 0,
        });

        setCurrentRound((round) => {
          round.response.message = '';
          round.steps = [];
          round.status = ConversationRoundStatus.inProgress;
        });

        // Verify the clear worked
        const afterData = queryClient.getQueryData<Conversation>(queryKey);
        const afterRound = afterData?.rounds?.at(-1);
        // eslint-disable-next-line no-console
        console.log('[clearLastRoundResponse] After clear:', {
          messageLength: afterRound?.response?.message?.length ?? 0,
          stepsCount: afterRound?.steps?.length ?? 0,
        });

        // eslint-disable-next-line no-console
        console.log('[clearLastRoundResponse] Local state cleared, starting fetch...');

        const conversation = await conversationsService.get({ conversationId });
        const lastRound = conversation.rounds?.at(-1);
        // eslint-disable-next-line no-console
        console.log('[clearLastRoundResponse] Fetched from server:', {
          messageLength: lastRound?.response?.message?.length ?? 0,
          stepsCount: lastRound?.steps?.length ?? 0,
        });

        queryClient.setQueryData(queryKey, conversation);
        // eslint-disable-next-line no-console
        console.log('[clearLastRoundResponse] Cache updated');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[clearLastRoundResponse] Failed to fetch:', error);
      }
    },
    setAgentId: (agentId: string) => {
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
    addReasoningStep: ({ step }: { step: ReasoningStep }) => {
      setCurrentRound((round) => {
        round.steps.push(step);
      });
    },
    addToolCall: ({ step }: { step: ToolCallStep }) => {
      setCurrentRound((round) => {
        round.steps.push(step);
      });
    },
    setToolCallProgress: ({
      progress,
      toolCallId,
    }: {
      progress: ToolCallProgress;
      toolCallId: string;
    }) => {
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
    setToolCallResult: ({ results, toolCallId }: { results: ToolResult[]; toolCallId: string }) => {
      setCurrentRound((round) => {
        const step = round.steps.filter(isToolCallStep).find((s) => s.tool_call_id === toolCallId);
        if (step) {
          step.results = results;
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
    setTimeToFirstToken: ({ timeToFirstToken }: { timeToFirstToken: number }) => {
      setCurrentRound((round) => {
        round.time_to_first_token = timeToFirstToken;
      });
    },
    setPendingPrompt: ({ prompt }: { prompt: PromptRequest }) => {
      setCurrentRound((round) => {
        round.pending_prompt = prompt;
        round.status = ConversationRoundStatus.awaitingPrompt;
      });
    },
    clearPendingPrompt: () => {
      setCurrentRound((round) => {
        round.pending_prompt = undefined;
        round.status = ConversationRoundStatus.inProgress;
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
  onConversationCreated,
  onDeleteConversation,
}: UseConversationActionsParams): ConversationActions => {
  const [, setAgentIdStorage] = useLocalStorage<string>(storageKeys.agentId);

  const conversationActions = useMemo(
    () =>
      createConversationActions({
        conversationId,
        queryClient,
        setAgentIdStorage,
        conversationsService,
        onConversationCreated,
        onDeleteConversation,
      }),
    [
      conversationId,
      queryClient,
      setAgentIdStorage,
      conversationsService,
      onConversationCreated,
      onDeleteConversation,
    ]
  );

  return conversationActions;
};
