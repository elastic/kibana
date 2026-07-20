/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@kbn/react-query';
import produce from 'immer-v9';
import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';

import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useNavigation } from './use_navigation';
import { appPaths } from '../utils/app_paths';

interface UseConversationListMutationsParams {
  routeConversationId: string | undefined;
  agentId: string;
}

export const useConversationListMutations = ({
  routeConversationId,
  agentId,
}: UseConversationListMutationsParams) => {
  const queryClient = useQueryClient();
  const { conversationsService } = useAgentBuilderServices();
  const { navigateToAgentBuilderUrl } = useNavigation();

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      await conversationsService.delete({ conversationId });

      const isCurrentConversation = routeConversationId === conversationId;

      queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

      if (isCurrentConversation) {
        navigateToAgentBuilderUrl(appPaths.root, undefined, { shouldStickToBottom: true });
      }
    },
    [conversationsService, queryClient, navigateToAgentBuilderUrl, routeConversationId]
  );

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      await conversationsService.rename({ conversationId, title });

      const key = queryKeys.conversations.byId(conversationId);
      const current = queryClient.getQueryData<Conversation>(key);
      if (current) {
        queryClient.setQueryData<Conversation>(
          key,
          produce(current, (draft) => {
            draft.title = title;
          })
        );
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
    [conversationsService, queryClient]
  );

  const listQueryKey = useMemo(() => queryKeys.conversations.byAgent(agentId), [agentId]);

  const updateReadStatus = useCallback(
    (conversationId: string, read: boolean) => {
      queryClient.setQueryData<Conversation>(
        queryKeys.conversations.byId(conversationId),
        (current) => {
          if (!current) return current;
          return produce(current, (draft) => {
            draft.read = read;
          });
        }
      );

      queryClient.setQueryData<ConversationWithoutRounds[]>(listQueryKey, (current) => {
        if (!current) return current;
        return produce(current, (draft) => {
          const conv = draft.find((c) => c.id === conversationId);
          if (conv) {
            conv.read = read;
          }
        });
      });

      conversationsService.updateReadStatus({ conversationId, read }).catch(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
        queryClient.invalidateQueries({ queryKey: listQueryKey });
      });
    },
    [conversationsService, queryClient, listQueryKey]
  );

  const markAsRead = useCallback(
    (conversationId: string) => updateReadStatus(conversationId, true),
    [updateReadStatus]
  );

  const markAsUnread = useCallback(
    (conversationId: string) => updateReadStatus(conversationId, false),
    [updateReadStatus]
  );

  return useMemo(
    () => ({ deleteConversation, renameConversation, markAsRead, markAsUnread }),
    [deleteConversation, renameConversation, markAsRead, markAsUnread]
  );
};
