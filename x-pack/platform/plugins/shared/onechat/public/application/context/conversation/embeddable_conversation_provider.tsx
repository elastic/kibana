/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import type { EmbeddableConversationInternalProps } from '../../../embeddable/types';
import { ConversationContext } from './conversation_context';
import { OnechatServicesContext } from '../onechat_services_context';
import { SendMessageProvider } from '../send_message/send_message_context';
import { queryKeys } from '../../query_keys';
import { storageKeys } from '../../storage_keys';
import { createNewConversation, newConversationId } from '../../utils/new_conversation';

const queryClient = new QueryClient();
const pendingRoundId = '__pending__';

interface EmbeddableConversationProviderProps extends EmbeddableConversationInternalProps {
  children: React.ReactNode;
}

export const EmbeddableConversationProvider: React.FC<EmbeddableConversationProviderProps> = ({
  children,
  coreStart,
  services,
  ...contextProps
}) => {
  const kibanaServices = useMemo(
    () => ({
      ...coreStart,
      plugins: services.startDependencies,
    }),
    [coreStart, services.startDependencies]
  );

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // React to conversationId changing through the flyout API
    setConversationId(contextProps.conversationId);
  }, [contextProps.conversationId]);

  const [, setAgentIdStorage] = useLocalStorage<string>(storageKeys.agentId);
  const { conversationsService } = services;
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);

  const setConversation = useCallback(
    (updater: (conversation?: Conversation) => Conversation) => {
      queryClient.setQueryData<Conversation>(queryKey, updater);
    },
    [queryKey]
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

  const conversationContextValue = useMemo(
    () => ({
      conversationId,
      shouldStickToBottom: false,

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
        // Update conversationId to show the newly created conversation in the UI
        setConversationId(id);
        // 2. Invalidate conversation list to get updated data from server
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      },
      deleteConversation: async (id: string) => {
        await conversationsService.delete({ conversationId: id });

        // Check if we're deleting the current conversation
        const isCurrentConversation = conversationId === id;

        if (isCurrentConversation) {
          // For embeddable context, we can't navigate.
          setConversationId(undefined);
        }

        queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      },
    }),
    [conversationId, setAgentId, queryKey, setConversation, setCurrentRound, conversationsService]
  );

  return (
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <OnechatServicesContext.Provider value={services}>
            <ConversationContext.Provider value={conversationContextValue}>
              <SendMessageProvider>{children}</SendMessageProvider>
            </ConversationContext.Provider>
          </OnechatServicesContext.Provider>
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );
};
