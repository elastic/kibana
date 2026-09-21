/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { isSharedConversation } from '@kbn/agent-builder-common';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ConversationPermissions } from '../../../common/http_api/conversations';
import type { ErrorPromptType } from '../components/common/prompt/error_prompt';
import { queryKeys } from '../query_keys';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useLastAgentId } from './use_last_agent_id';
import { useIsCurrentConversationStreaming } from './use_is_current_conversation_streaming';

const POLL_INTERVAL_MS = 5_000;

export const useConversation = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useAgentBuilderServices();
  const queryKey = queryKeys.conversations.byId(conversationId ?? '');

  const isThisConversationStreaming = useIsCurrentConversationStreaming();

  const {
    data: conversation,
    isLoading,
    isFetching,
    isFetched,
    isError,
    error,
  } = useQuery({
    queryKey,
    // While this client streams into the conversation the live events are the source of truth and
    // the saved document lags behind them by design; reading it mid-run only produces disagreements
    // (a second copy of the pending message before `execution_started` for example).
    enabled: Boolean(conversationId) && !isThisConversationStreaming,
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
    refetchInterval: (data) =>
      isSharedConversation(data?.access_control) ? POLL_INTERVAL_MS : false,
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
    // Not `isLoading`: v4 reports it for disabled queries too.
    isLoading: Boolean(conversationId) && !conversation && isFetching,
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
