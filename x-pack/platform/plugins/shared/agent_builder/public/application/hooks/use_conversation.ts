/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import { useMemo } from 'react';
import { ConversationRoundStatus, type Conversation } from '@kbn/agent-builder-common';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ConversationPermissions } from '../../../common/http_api/conversations';
import type { ErrorPromptType } from '../components/common/prompt/error_prompt';
import { queryKeys } from '../query_keys';
import { createNewRound, pendingRoundId } from '../utils/new_conversation';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useStreamingContext, useStreamRecord } from '../context/streaming/streaming_context';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useLastAgentId } from './use_last_agent_id';

export const useConversation = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.conversations.byId(conversationId ?? '');
  const { activeStreams, byConversationId } = useStreamingContext();

  // Disable the query when this conversation is being written to by a stream, OR when
  // its cached state shows a HITL pause, OR when there's an unpersisted error in the
  // per-conversation error map. The cache is authoritative in all three cases; a
  // refetch would race with optimistic chunks (streaming), or with the resume mutation
  // about to fire (HITL), or 404 a fresh conversation that errored before the backend
  // persisted it (overriding the in-round error UI with "Conversation not found").
  const isAwaitingPrompt =
    queryClient.getQueryData<Conversation>(queryKey)?.rounds?.at(-1)?.status ===
    ConversationRoundStatus.awaitingPrompt;

  const isThisConversationStreaming = Boolean(conversationId && activeStreams.has(conversationId));

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

export const useConversationPermissions = (): ConversationPermissions => {
  const { conversation } = useConversation();

  return {
    rename: conversation?.permissions.rename ?? false,
    delete: conversation?.permissions.delete ?? false,
    update_access_control: conversation?.permissions.update_access_control ?? false,
  };
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

export const useAgentId = () => {
  const { conversation } = useConversation();
  const context = useConversationContext();
  const conversationId = useConversationId();
  const isNewConversation = !conversationId;
  const { agentId: lastAgentId } = useLastAgentId();

  if (isNewConversation) {
    return context.agentId ?? lastAgentId;
  }

  if (conversation?.agent_id) {
    return conversation.agent_id;
  }

  return context.agentId;
};

export const useConversationTitle = () => {
  const { conversation, isLoading } = useConversation();
  return {
    title: conversation?.title ?? '',
    isLoading,
  };
};

export const useConversationReadOnly = () => {
  const conversationId = useConversationId();
  const { conversation, isFetching } = useConversation();

  return {
    isReadOnly: conversation?.read_only ?? false,
    // Not `isLoading`: v4 reports it for disabled queries too, and this query stays disabled
    // for the whole stream that creates a conversation.
    isLoading: Boolean(conversationId) && !conversation && isFetching,
  };
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

export const useIsUnpersistedConversation = (conversation?: Conversation) => {
  const conversationId = useConversationId();
  const { activeStreams } = useStreamingContext();
  const { pendingMessage, error } = useStreamRecord(conversationId);
  const isConversationStreaming = Boolean(conversationId && activeStreams.has(conversationId));

  return Boolean(
    (isConversationStreaming && conversation?.rounds[0]?.id === pendingRoundId) ||
      (error && pendingMessage && conversation?.rounds.length === 0)
  );
};

export const useIsAwaitingPrompt = () => {
  const conversationRounds = useConversationRounds();
  const lastRound = conversationRounds.at(-1);
  return lastRound?.status === ConversationRoundStatus.awaitingPrompt;
};
