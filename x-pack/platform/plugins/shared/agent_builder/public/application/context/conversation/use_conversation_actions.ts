/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { QueryClient } from '@kbn/react-query';
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

    refetchConversation: () => queryClient.cancelQueries({ queryKey }).then(fetchConversation),

    deleteConversation: async (id: string) => {
      await conversationsService.delete({ conversationId: id });

      const isCurrentConversation = conversationId === id;

      queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

      if (onDeleteConversation) {
        onDeleteConversation({ id, isCurrentConversation });
      }
    },
    renameConversation: async (id: string, title: string) => {
      await conversationsService.rename({ conversationId: id, title });

      const conversationQueryKey = queryKeys.conversations.byId(id);
      const currentConversation = queryClient.getQueryData<Conversation>(conversationQueryKey);
      if (currentConversation) {
        queryClient.setQueryData<Conversation>(conversationQueryKey, {
          ...currentConversation,
          title,
        });
      }

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
