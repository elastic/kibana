/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { QueryClient } from '@kbn/react-query';
import produce from 'immer-v9';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationsService } from '../../../services/conversations';
import { queryKeys } from '../../query_keys';

export interface ConversationActions {
  invalidateConversation: () => void;
  onExecutionStarted: () => void;
  onExecutionTerminated: () => void;
  refetchConversation: () => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
}

interface UseConversationActionsParams {
  conversationId?: string;
  queryClient: QueryClient;
  conversationsService: ConversationsService;
  onDeleteConversation?: (params: { id: string; isCurrentConversation: boolean }) => void;
}

export const createConversationActions = ({
  conversationId,
  queryClient,
  conversationsService,
  onDeleteConversation,
}: UseConversationActionsParams): ConversationActions => {
  const queryKey = queryKeys.conversations.byId(conversationId ?? '');
  // `fetchQuery` rather than `invalidateQueries`: it fetches whether or not an observer is mounted
  // and resolves with the response, which the completion release needs.
  const fetchConversation = () => {
    if (!conversationId) {
      return Promise.reject(new Error('Invalid conversation id'));
    }
    return queryClient.fetchQuery({
      queryKey,
      queryFn: () => conversationsService.get({ conversationId }),
    });
  };
  const refreshConversationList = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
  };

  return {
    invalidateConversation: () => {
      queryClient.invalidateQueries({ queryKey });
    },

    onExecutionStarted: () => {
      refreshConversationList();
    },

    onExecutionTerminated: () => {
      refreshConversationList();
    },

    // A request already in flight was sent before the execution was persisted and would be
    // returned by `fetchQuery` as-is; cancel it so the response reflects the completed execution.
    refetchConversation: () => queryClient.cancelQueries({ queryKey }).then(fetchConversation),

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
  onDeleteConversation,
}: UseConversationActionsParams): ConversationActions => {
  const conversationActions = useMemo(
    () =>
      createConversationActions({
        conversationId,
        queryClient,
        conversationsService,
        onDeleteConversation,
      }),
    [conversationId, queryClient, conversationsService, onDeleteConversation]
  );

  return conversationActions;
};
