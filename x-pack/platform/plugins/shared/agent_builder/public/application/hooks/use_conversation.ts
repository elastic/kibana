/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  agentBuilderDefaultAgentId,
  ConversationRoundStatus,
  type Conversation,
} from '@kbn/agent-builder-common';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ErrorPromptType } from '../components/common/prompt/error_prompt';
import { queryKeys } from '../query_keys';
import { createNewRound } from '../utils/new_conversation';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { storageKeys } from '../storage_keys';
import {
  useSendMessageContext,
  useStreamRecord,
} from '../context/send_message/send_message_context';
import { useActiveSpaceId } from '../context/active_space_context';
import { useValidateAgentId } from './agents/use_validate_agent_id';
import { useConversationContext } from '../context/conversation/conversation_context';

export const useConversation = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.conversations.byId(conversationId ?? '');
  const { activeStream, byConversationId } = useSendMessageContext();

  // Disable the query when this conversation is being written to by a stream, OR when
  // its cached state shows a HITL pause, OR when there's an unpersisted error in the
  // per-conversation error map. The cache is authoritative in all three cases; a
  // refetch would race with optimistic chunks (streaming), or with the resume mutation
  // about to fire (HITL), or 404 a fresh conversation that errored before the backend
  // persisted it (overriding the in-round error UI with "Conversation not found").
  const isAwaitingPrompt =
    queryClient.getQueryData<Conversation>(queryKey)?.rounds?.at(-1)?.status ===
    ConversationRoundStatus.awaitingPrompt;

  const isThisConversationStreaming = activeStream?.conversationId === conversationId;

  const hasUnpersistedError = conversationId
    ? Boolean(byConversationId[conversationId]?.error)
    : false;

  const {
    data: conversation,
    isLoading,
    isFetching,
    isFetched,
    isError,
    error,
  } = useQuery({
    queryKey,
    enabled:
      Boolean(conversationId) &&
      !isThisConversationStreaming &&
      !isAwaitingPrompt &&
      !hasUnpersistedError,
    queryFn: () => {
      if (!conversationId) {
        return Promise.reject(new Error('Invalid conversation id'));
      }
      return conversationsService.get({ conversationId });
    },
    retry: (failureCount, httpError: IHttpFetchError) => {
      // Never retry if conversation doesn't exist
      if (httpError?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    // Refetching an errored query (no cached success) resets status `error` → `loading`,
    // which would clear `errorType` and flip `Conversation`'s conditional rendering. Resulting in a loop of unmounts/remounts.
    retryOnMount: false,
  });

  return { conversation, isLoading, isFetching, isFetched, isError, error };
};

export const useConversationStatus = () => {
  const { isLoading, isFetching, isFetched } = useConversation();
  return { isLoading, isFetching, isFetched };
};

const getErrorTypeFromStatus = (status?: number): ErrorPromptType => {
  if (status === 404) {
    return 'CONVERSATION_NOT_FOUND';
  }
  return 'GENERIC_ERROR';
};

export const useConversationError = () => {
  const { isError, error } = useConversation();

  const httpError = error as IHttpFetchError | undefined;
  const errorStatus = httpError?.response?.status;
  const errorType = isError && errorStatus ? getErrorTypeFromStatus(errorStatus) : undefined;

  return {
    isError,
    error: httpError,
    errorStatus,
    errorType,
  };
};

const useGetNewConversationAgentId = () => {
  const spaceId = useActiveSpaceId();
  const [agentIdStorage] = useLocalStorage<string>(storageKeys.getAgentIdKey(spaceId));
  const validateAgentId = useValidateAgentId();

  // Ensure we always return a string
  return (): string => {
    const isAgentIdValid = validateAgentId(agentIdStorage);
    if (isAgentIdValid) {
      return agentIdStorage;
    }
    return agentBuilderDefaultAgentId;
  };
};

export const useAgentId = () => {
  const { conversation } = useConversation();
  const context = useConversationContext();
  const conversationId = useConversationId();
  const isNewConversation = !conversationId;
  const getNewConversationAgentId = useGetNewConversationAgentId();

  // For new conversations, URL (context.agentId) is the source of truth
  if (isNewConversation) {
    return context.agentId ?? getNewConversationAgentId();
  }

  // For existing conversations, use the conversation's stored agent_id
  if (conversation?.agent_id) {
    return conversation.agent_id;
  }

  // Fallback to context (URL) for edge cases
  return context.agentId;
};

export const useConversationTitle = () => {
  const { conversation, isLoading } = useConversation();
  return { title: conversation?.title ?? '', isLoading };
};

export const useConversationRounds = () => {
  const { conversation } = useConversation();
  const conversationId = useConversationId();
  const { pendingMessage, error, errorSteps } = useStreamRecord(conversationId);

  const conversationRounds = useMemo(() => {
    const rounds = conversation?.rounds ?? [];
    if (Boolean(error) && pendingMessage) {
      const pendingRound = createNewRound({
        userMessage: pendingMessage,
        roundId: '',
        steps: errorSteps,
      });
      return [...rounds, pendingRound];
    }
    return rounds;
  }, [conversation?.rounds, error, errorSteps, pendingMessage]);

  return conversationRounds;
};

// Returns a flattened list of all steps across all rounds.
// CAUTION: This uses `conversationRounds.length` as useMemo key to prevent re-renders during streaming. This will return stale data for the last round. It will only contain the complete set of steps up until the previous round.
export const useStepsFromPrevRounds = () => {
  const conversationRounds = useConversationRounds();

  return useMemo(() => {
    return conversationRounds.flatMap(({ steps }) => steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationRounds.length]); // only depend on length to avoid re-renders during streaming
};

export const useHasActiveConversation = () => {
  const hasPersistedConversation = useHasPersistedConversation();
  const conversationRounds = useConversationRounds();
  return hasPersistedConversation || conversationRounds.length > 0;
};

export const useHasPersistedConversation = () => {
  const conversationId = useConversationId();
  return Boolean(conversationId);
};

export const useIsAwaitingPrompt = () => {
  const conversationRounds = useConversationRounds();
  const lastRound = conversationRounds.at(-1);
  return lastRound?.status === ConversationRoundStatus.awaitingPrompt;
};
