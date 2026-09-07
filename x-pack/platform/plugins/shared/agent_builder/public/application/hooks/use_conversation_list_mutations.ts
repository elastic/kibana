/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@kbn/react-query';
import produce from 'immer-v9';
import { i18n } from '@kbn/i18n';
import type { Conversation } from '@kbn/agent-builder-common';

import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useNavigation } from './use_navigation';
import { useToasts } from './use_toasts';
import { appPaths } from '../utils/app_paths';
import {
  movePinnedConversationBetweenLists,
  patchConversationList,
} from '../utils/conversation_sidebar_list_cache';

const pinnedUpdateErrorTitle = i18n.translate(
  'xpack.agentBuilder.conversations.pinnedUpdateError',
  { defaultMessage: 'Failed to update pin status' }
);

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
  const { addErrorToast } = useToasts();

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      await conversationsService.delete({ conversationId });

      const isCurrentConversation = routeConversationId === conversationId;

      queryClient.removeQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

      if (isCurrentConversation) {
        navigateToAgentBuilderUrl(appPaths.root);
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

  const rollbackConversationCaches = useCallback(
    (conversationId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
    },
    [queryClient]
  );

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

      // Apply across all paged list variants via the shared helper.
      patchConversationList({ queryClient, agentId, conversationId, values: { read } });

      conversationsService.updateReadStatus({ conversationId, read }).catch(() => {
        rollbackConversationCaches(conversationId);
      });
    },
    [conversationsService, queryClient, agentId, rollbackConversationCaches]
  );

  const markAsRead = useCallback(
    (conversationId: string) => updateReadStatus(conversationId, true),
    [updateReadStatus]
  );

  const markAsUnread = useCallback(
    (conversationId: string) => updateReadStatus(conversationId, false),
    [updateReadStatus]
  );

  const updatePinnedStatus = useCallback(
    (conversationId: string, pinned: boolean) => {
      const now = new Date().toISOString();

      queryClient.setQueryData<Conversation>(
        queryKeys.conversations.byId(conversationId),
        (current) => {
          if (!current) return current;
          return produce(current, (draft) => {
            draft.pinned = pinned;
            draft.updated_at = now;
          });
        }
      );

      // Move the row between the pinned and unpinned caches, then patch updated_at everywhere.
      movePinnedConversationBetweenLists({ queryClient, agentId, conversationId, pinned });
      patchConversationList({ queryClient, agentId, conversationId, values: { updated_at: now } });

      conversationsService.updatePinnedStatus({ conversationId, pinned }).catch(() => {
        rollbackConversationCaches(conversationId);
        addErrorToast({ title: pinnedUpdateErrorTitle });
      });
    },
    [conversationsService, queryClient, agentId, rollbackConversationCaches, addErrorToast]
  );

  const markAsPinned = useCallback(
    (conversationId: string) => updatePinnedStatus(conversationId, true),
    [updatePinnedStatus]
  );

  const markAsUnpinned = useCallback(
    (conversationId: string) => updatePinnedStatus(conversationId, false),
    [updatePinnedStatus]
  );

  return useMemo(
    () => ({
      deleteConversation,
      renameConversation,
      markAsRead,
      markAsUnread,
      markAsPinned,
      markAsUnpinned,
    }),
    [deleteConversation, renameConversation, markAsRead, markAsUnread, markAsPinned, markAsUnpinned]
  );
};
