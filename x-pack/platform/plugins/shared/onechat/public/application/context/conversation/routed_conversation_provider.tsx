/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useQueryClient } from '@tanstack/react-query';
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
import { ConversationContext } from './conversation_context';
import type { LocationState } from '../../hooks/use_navigation';
import { newConversationId } from '../../utils/new_conversation';
import { queryKeys } from '../../query_keys';
import { storageKeys } from '../../storage_keys';
import { appPaths } from '../../utils/app_paths';
import { createNewConversation } from '../../utils/new_conversation';
import { useNavigation } from '../../hooks/use_navigation';
import { useOnechatServices } from '../../hooks/use_onechat_service';
import { useOnechatAgents } from '../../hooks/agents/use_agents';
import { searchParamNames } from '../../search_param_names';

const pendingRoundId = '__pending__';

interface RoutedConversationProviderProps {
  children: React.ReactNode;
}

export const RoutedConversationProvider: React.FC<RoutedConversationProviderProps> = ({
  children,
}) => {
  const { conversationId: conversationIdParam } = useParams<{ conversationId?: string }>();

  const conversationId = useMemo(() => {
    return conversationIdParam === newConversationId ? undefined : conversationIdParam;
  }, [conversationIdParam]);

  const location = useLocation<LocationState>();
  const shouldStickToBottom = location.state?.shouldStickToBottom ?? true;

  // Get search params for agent ID syncing
  const [searchParams] = useSearchParams();
  const { agents } = useOnechatAgents();

  // All the conversation actions logic (moved from useConversationActions)
  const queryClient = useQueryClient();
  const [, setAgentIdStorage] = useLocalStorage<string>(storageKeys.agentId);
  const { conversationsService } = useOnechatServices();
  const { navigateToOnechatUrl } = useNavigation();
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);
  const shouldAllowConversationRedirectRef = useRef(true);
  const agentIdSyncedRef = useRef(false);

  useEffect(() => {
    return () => {
      // On unmount disable conversation redirect
      shouldAllowConversationRedirectRef.current = false;
    };
  }, []);

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

  // Handle agent ID syncing from URL params (moved from useSyncAgentId)
  useEffect(() => {
    if (agentIdSyncedRef.current || conversationId) {
      return;
    }

    // If we don't have a selected agent id, check for a valid agent id in the search params
    // This is used for the "chat with agent" action on the Agent pages
    const agentIdParam = searchParams.get(searchParamNames.agentId);

    if (agentIdParam && agents.some((agent) => agent.id === agentIdParam)) {
      // Agent id passed to sync is valid, set it and mark as synced
      setAgentId(agentIdParam);
      agentIdSyncedRef.current = true;
    }
  }, [searchParams, agents, conversationId, setAgentId]);

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

  const navigateToConversation = useCallback(
    ({ nextConversationId }: { nextConversationId: string }) => {
      // Navigate to the conversation if redirect is allowed
      if (shouldAllowConversationRedirectRef.current) {
        const path = appPaths.chat.conversation({ conversationId: nextConversationId });
        const params = undefined;
        const state = { shouldStickToBottom: false };
        navigateToOnechatUrl(path, params, state);
      }
    },
    [shouldAllowConversationRedirectRef, navigateToOnechatUrl]
  );

  const contextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom,

      // Conversation actions
      removeNewConversationQuery: () => {
        queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(newConversationId) });
      },
      invalidateConversation: () => {
        queryClient.invalidateQueries({ queryKey });
      },
      addOptimisticRound: ({ userMessage }: { userMessage: string }) => {
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
      removeOptimisticRound: () => {
        setConversation(
          produce((draft) => {
            draft?.rounds?.pop();
          })
        );
      },
      setAgentId,
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
          const step = round.steps
            .filter(isToolCallStep)
            .find((s) => s.tool_call_id === toolCallId);
          if (step) {
            if (!step.progression) {
              step.progression = [];
            }
            step.progression.push(progress);
          }
        });
      },
      setToolCallResult: ({
        results,
        toolCallId,
      }: {
        results: ToolResult[];
        toolCallId: string;
      }) => {
        setCurrentRound((round) => {
          const step = round.steps
            .filter(isToolCallStep)
            .find((s) => s.tool_call_id === toolCallId);
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
        // 1. Update individual conversation cache (with rounds)
        queryClient.setQueryData<Conversation>(
          queryKeys.conversations.byId(id),
          produce(current, (draft) => {
            draft.id = id;
            draft.title = title;
          })
        );
        // 2. Invalidate conversation list to get updated data from server - this updates the conversations view in the sidebar
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        navigateToConversation({ nextConversationId: id });
      },
      deleteConversation: async (id: string) => {
        await conversationsService.delete({ conversationId: id });

        // Check if we're deleting the current conversation
        const isCurrentConversation = conversationId === id;

        if (isCurrentConversation) {
          // If deleting current conversation, navigate to new conversation
          const path = appPaths.chat.new;
          navigateToOnechatUrl(path, undefined, { shouldStickToBottom: true });
        }
        // If deleting other conversations, stay at current conversation (no navigation needed)

        queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      },
    }),
    [
      conversationId,
      shouldStickToBottom,
      setAgentId,
      queryClient,
      queryKey,
      setConversation,
      setCurrentRound,
      navigateToConversation,
      conversationsService,
      navigateToOnechatUrl,
    ]
  );

  return (
    <ConversationContext.Provider value={contextValue}>{children}</ConversationContext.Provider>
  );
};
