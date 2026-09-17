/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import { useMemo } from 'react';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { isSharedConversation, type Conversation } from '@kbn/agent-builder-common';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ConversationPermissions } from '../../../common/http_api/conversations';
import type { ErrorPromptType } from '../components/common/prompt/error_prompt';
import { queryKeys } from '../query_keys';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversationStreamService } from '../context/streaming/streaming_context';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useLastAgentId } from './use_last_agent_id';
import { useIsCurrentConversationStreaming } from './use_is_current_conversation_streaming';
import { activeExecutionToItem } from '../components/conversations/timeline/to_timeline_items';
import { isEventsAwaitingPrompt } from '../../services/events/is_events_awaiting_prompt';

const POLL_INTERVAL_MS = 5_000;

export const useConversation = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.conversations.byId(conversationId ?? '');

  const cached = queryClient.getQueryData<Conversation>(queryKey);
  const isThisConversationStreaming = useIsCurrentConversationStreaming();

  // A conversation is persisted once it has been fetched, or when nothing is streaming into it.
  // The one unknown is a new conversation before its first SSE event: the app navigates to its
  // URL before the request reaches the server, and a GET would 404. The stream's
  // `execution_started` fetch puts it in the cache, after which it stays persisted.
  const isPersisted = Boolean(cached) || !isThisConversationStreaming;

  const isAwaitingPrompt = isEventsAwaitingPrompt(cached?.events ?? []);

  const {
    data: conversation,
    isLoading,
    isFetching,
    isFetched,
    isError,
    error,
  } = useQuery({
    queryKey,
    enabled: Boolean(conversationId) && isPersisted && !isAwaitingPrompt,
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
    // Shared conversations can be written to by other participants, so poll for their rounds.
    // Do not poll while this client streams: the poll would show the saved copy of the pending
    // message before `execution_started` supplies the id that lets the timeline match the two.
    refetchInterval: (data) =>
      isSharedConversation(data?.access_control) && !isThisConversationStreaming
        ? POLL_INTERVAL_MS
        : false,
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
  const isStreaming = useIsCurrentConversationStreaming();

  return {
    isReadOnly: conversation?.read_only ?? false,
    // Not `isLoading`: v4 reports it for disabled queries too. A conversation this client is
    // streaming into is not read-only, so its first fetch must not hide the input.
    isLoading: Boolean(conversationId) && !conversation && isFetching && !isStreaming,
  };
};

export const useConversationRounds = () => {
  const { conversation } = useConversation();
  return useMemo(() => conversation?.rounds ?? [], [conversation?.rounds]);
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
  const isConversationStreaming = useIsCurrentConversationStreaming();
  return isConversationStreaming && !conversation;
};

export const useIsAwaitingPrompt = () => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const conversationStreamService = useConversationStreamService();

  const activeStream$ = useMemo(
    () => (conversationId ? conversationStreamService.getActiveStream$(conversationId) : of(null)),
    [conversationStreamService, conversationId]
  );
  const activeExecution = useObservable(activeStream$, null);

  if (activeExecution && activeExecutionToItem(activeExecution).status === 'awaiting_prompt') {
    return true;
  }
  return isEventsAwaitingPrompt(conversation?.events ?? [], activeExecution?.promptResponse);
};
