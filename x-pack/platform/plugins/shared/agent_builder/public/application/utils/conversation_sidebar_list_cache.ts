/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';

import type { ConversationWithoutRoundsWithPermissions } from '../../../common/http_api/conversations';
import type { ConversationsService } from '../../services/conversations/conversations_service';
import { queryKeys } from '../query_keys';

const agentConversationListKey = (agentId: string) => queryKeys.conversations.byAgent(agentId);

const buildSidebarConversationListRow = (p: {
  id: string;
  agent_id: string;
  title: string;
}): ConversationWithoutRoundsWithPermissions => {
  const t = new Date().toISOString();
  return {
    id: p.id,
    agent_id: p.agent_id,
    user: { id: '', username: '' },
    title: p.title,
    created_at: t,
    updated_at: t,
    // The current user is starting this conversation, so they own it.
    permissions: { rename_conversation: true, delete_conversation: true },
  };
};

export const insertSidebarConversationListRow = async ({
  queryClient,
  conversationsService,
  agentId,
  conversationId,
  title,
}: {
  queryClient: QueryClient;
  conversationsService: ConversationsService;
  agentId: string;
  conversationId: string;
  title: string;
}): Promise<boolean> => {
  const row = buildSidebarConversationListRow({
    id: conversationId,
    agent_id: agentId,
    title,
  });
  const key = agentConversationListKey(agentId);

  // Ensure the server list is in cache before we prepend — otherwise `cancelQueries`
  // below kills the in-flight GET and the sidebar ends up showing only the new row.
  if (queryClient.getQueryData<ConversationWithoutRoundsWithPermissions[]>(key) === undefined) {
    try {
      await queryClient.fetchQuery({
        queryKey: key,
        queryFn: () => conversationsService.list({ agentId }),
      });
    } catch {
      // Proceed with the optimistic insert even if the prefetch fails — the next
      // explicit refresh of the sidebar will pick up the server state.
    }
  }

  await queryClient.cancelQueries({ queryKey: key });

  let inserted = false;
  queryClient.setQueryData<ConversationWithoutRoundsWithPermissions[] | undefined>(key, (prev) => {
    if (prev?.some((c) => c.id === row.id)) {
      return prev;
    }
    inserted = true;
    return [row, ...(prev ?? [])];
  });

  return inserted;
};

export const removeSidebarConversationListRow = ({
  queryClient,
  agentId,
  conversationId,
}: {
  queryClient: QueryClient;
  agentId: string;
  conversationId: string;
}) => {
  const key = agentConversationListKey(agentId);
  queryClient.setQueryData<ConversationWithoutRoundsWithPermissions[] | undefined>(key, (prev) => {
    if (!prev?.length) {
      return prev;
    }
    return prev.filter((c) => c.id !== conversationId);
  });
};

export const patchConversationList = ({
  queryClient,
  agentId,
  conversationId,
  values,
}: {
  queryClient: QueryClient;
  agentId: string;
  conversationId: string;
  values: Partial<ConversationWithoutRoundsWithPermissions>;
}) => {
  const key = agentConversationListKey(agentId);
  queryClient.setQueryData<ConversationWithoutRoundsWithPermissions[] | undefined>(key, (prev) => {
    if (!prev?.length) return prev;
    let changed = false;
    const next = prev.map((c) => {
      if (c.id !== conversationId) return c;
      const hasChanges = (
        Object.keys(values) as Array<keyof ConversationWithoutRoundsWithPermissions>
      ).some((k) => values[k] !== c[k]);
      if (!hasChanges) return c;
      changed = true;
      return { ...c, ...values };
    });
    return changed ? next : prev;
  });
};
