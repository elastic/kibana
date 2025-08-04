/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation, ConversationRound, ToolCallStep, isToolCallStep } from '@kbn/onechat-common';
import { QueryClient, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import produce from 'immer';
import { useEffect, useMemo, useRef } from 'react';
import { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { queryKeys } from '../query_keys';
import { appPaths } from '../utils/app_paths';
import { createNewConversation, newConversationId } from '../utils/new_conversation';
import { useConversationId } from './use_conversation_id';
import { useIsSendingMessage } from './use_is_sending_message';
import { useNavigation } from './use_navigation';
import { useOnechatServices } from './use_onechat_service';

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
  const removeNewConversationQuery = () => {
    queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(newConversationId) });
  };
  const [_, conversationId] = queryKey;
  const isNewConversation = conversationId === newConversationId;
  return {
    invalidateConversation: () => {
      removeNewConversationQuery();
      queryClient.invalidateQueries({ queryKey });
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
            draft.agent_id = agentId;
          }
        })
      );
    },
    addToolCall: ({ step }: { step: ToolCallStep }) => {
      setCurrentRound((round) => {
        round.steps.push(step);
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
  };
};

export const useConversation = () => {
  const shouldAllowConversationRedirectRef = useRef(true);
  const conversationId = useConversationId();
  const { conversationsService } = useOnechatServices();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);
  const isSendingMessage = useIsSendingMessage();
  const { data: conversation, isLoading } = useQuery({
    queryKey,
    // Disable query if we are on a new conversation or if there is a message currently being sent
    // Otherwise a refetch will overwrite our optimistic updates
    enabled: Boolean(conversationId) && !isSendingMessage,
    queryFn: () => {
      if (!conversationId) {
        return Promise.reject(new Error('Invalid conversation id'));
      }
      return conversationsService.get({ conversationId });
    },
  });
  const { navigateToOnechatUrl } = useNavigation();

  useEffect(() => {
    return () => {
      // On unmount disable conversation redirect
      shouldAllowConversationRedirectRef.current = false;
    };
  }, []);

  const actions = useMemo(
    () =>
      createActions({
        queryClient,
        queryKey,
        navigateToConversation: ({ nextConversationId }: { nextConversationId: string }) => {
          // Navigate to the new conversation if user is still on the "new" conversation page
          if (!conversationId && shouldAllowConversationRedirectRef.current) {
            navigateToOnechatUrl(
              appPaths.chat.conversation({ conversationId: nextConversationId })
            );
          }
        },
      }),
    [queryClient, queryKey, conversationId, navigateToOnechatUrl]
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
