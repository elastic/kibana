/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ReasoningStep,
  ToolCallProgress,
  ToolCallStep,
} from '@kbn/onechat-common';
import { isToolCallStep, isConversationNotFoundError } from '@kbn/onechat-common';

import type { Conversation } from '@kbn/onechat-common';
import { useQueryClient } from '@tanstack/react-query';
import produce from 'immer';
import { useEffect, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { useConversationId } from './use_conversation_id';
import { createNewConversation, newConversationId } from '../utils/new_conversation';
import { queryKeys } from '../query_keys';
import { useNavigation } from './use_navigation';
import { appPaths } from '../utils/app_paths';
import { useOnechatServices } from './use_onechat_service';
import type { ConversationSettings } from '../../services/types';
import { useOnechatLastConversation } from './use_space_aware_context/use_last_conversation';
import { useOnechatSpaceId } from './use_space_aware_context/use_space_id';

const pendingRoundId = '__pending__';

export const useConversationActions = () => {
  const queryClient = useQueryClient();
  const conversationId = useConversationId();
  // Space-aware context hooks - these will be used when conversation settings are properly set up
  const spaceId = useOnechatSpaceId();
  const { setLastConversation } = useOnechatLastConversation({ spaceId });
  const { conversationSettingsService, conversationsService } = useOnechatServices();
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);

  // Subscribe to conversation settings to get the isFlyoutMode
  const conversationSettings = useObservable<ConversationSettings>(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  const isFlyoutMode = conversationSettings?.isFlyoutMode;
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
  const removeNewConversationQuery = () => {
    queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(newConversationId) });
  };
  const { navigateToOnechatUrl } = useNavigation();
  const shouldAllowConversationRedirectRef = useRef(true);
  useEffect(() => {
    return () => {
      // On unmount disable conversation redirect
      shouldAllowConversationRedirectRef.current = false;
    };
  }, []);
  const setSelectedConversation = ({ conversationId: id }: { conversationId?: string }) => {
    // Update the last conversation in localStorage
    setLastConversation({
      id: id ?? '',
    });
    conversationSettingsService.setConversationSettings({
      ...conversationSettings,
      selectedConversationId: id ?? undefined,
    });
  };

  const navigateToConversation = ({
    nextConversationId,
  }: {
    nextConversationId: string | undefined;
  }) => {
    // Navigate to the new conversation if user is still on the "new" conversation page
    if (!conversationId && shouldAllowConversationRedirectRef.current) {
      if (isFlyoutMode) {
        setSelectedConversation({ conversationId: nextConversationId });
      } else {
        navigateToOnechatUrl(
          nextConversationId
            ? appPaths.chat.conversation({ conversationId: nextConversationId })
            : appPaths.chat.new
        );
      }
    }
  };

  return {
    setSelectedConversation,
    invalidateConversation: () => {
      removeNewConversationQuery();
      queryClient.invalidateQueries({ queryKey });
    },
    addConversationRound: ({ userMessage }: { userMessage: string }) => {
      setConversation(
        produce((draft) => {
          const nextRound: ConversationRound = {
            id: pendingRoundId,
            input: {
              message: `${
                conversationSettings?.transformUserContextPrompt?.(userMessage) ?? userMessage
              }`,
            },
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
    },
    setConnector: (connectorId: string) => {
      setConversation(
        produce((draft) => {
          if (!draft) {
            const newConversation = createNewConversation();
            newConversation.connector_id = connectorId;
            return newConversation;
          }

          draft.connector_id = connectorId;
        })
      );
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
      queryClient.setQueryData<Conversation>(
        queryKeys.conversations.byId(id),
        produce(current, (draft) => {
          draft.id = id;
          draft.title = title;
        })
      );
      removeNewConversationQuery();
      // Invalidate all conversations to refresh conversation history
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      navigateToConversation({ nextConversationId: id });
    },
    deleteConversation: async (id: string) => {
      try {
        await conversationsService.delete({ conversationId: id });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        removeNewConversationQuery();
        navigateToConversation({ nextConversationId: '' });
      } catch (error) {
        // If conversation is not found on server, set localStorageLastConversation to empty string
        if (isConversationNotFoundError(error)) {
          setLastConversation({ id: '' });
        }
        throw error;
      }
    },
  };
};
