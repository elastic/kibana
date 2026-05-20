/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';

import { queryKeys } from '../query_keys';

const agentConversationListKey = (agentId: string) => queryKeys.conversations.byAgent(agentId);

const buildSidebarConversationListRow = (p: {
  id: string;
  agent_id: string;
  title: string;
}): ConversationWithoutRounds => {
  const t = new Date().toISOString();
  return {
    id: p.id,
    agent_id: p.agent_id,
    user: { id: '', username: '' },
    title: p.title,
    created_at: t,
    updated_at: t,
  };
};

export const insertSidebarConversationListRow = async ({
  queryClient,
  agentId,
  conversationId,
  title,
}: {
  queryClient: QueryClient;
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
  await queryClient.cancelQueries({ queryKey: key });

  let inserted = false;
  queryClient.setQueryData<ConversationWithoutRounds[] | undefined>(key, (prev) => {
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
  queryClient.setQueryData<ConversationWithoutRounds[] | undefined>(key, (prev) => {
    if (!prev?.length) {
      return prev;
    }
    return prev.filter((c) => c.id !== conversationId);
  });
};

/**
 * Patch (or upsert) the title of a single sidebar list row.
 *
 * Called by `onConversationCreated` when the chat stream emits the
 * `conversation_created` event and we receive the server-generated title that replaces
 * the placeholder "New conversation" set by `insertSidebarConversationListRow`.
 *
 * If the optimistic row was evicted by a background server refetch before this event
 * fired (e.g. the user opened the conversation list mid-stream and the server's response
 * returned a list that didn't include the not-yet-persisted conversation), the row is
 * re-inserted at the top with the real title rather than silently no-oping.
 */
export const patchSidebarConversationListTitle = ({
  queryClient,
  agentId,
  conversationId,
  title,
}: {
  queryClient: QueryClient;
  agentId: string;
  conversationId: string;
  title: string;
}) => {
  const key = agentConversationListKey(agentId);
  queryClient.setQueryData<ConversationWithoutRounds[] | undefined>(key, (prev) => {
    // List was never loaded — don't create it from scratch; it will be fetched on next mount.
    if (prev === undefined) return prev;

    const exists = prev.some((c) => c.id === conversationId);
    if (exists) {
      let changed = false;
      const next = prev.map((c) => {
        if (c.id !== conversationId || c.title === title) return c;
        changed = true;
        return { ...c, title };
      });
      return changed ? next : prev;
    }

    // Row was evicted by a background server refetch; re-insert at top with the real title.
    return [
      buildSidebarConversationListRow({ id: conversationId, agent_id: agentId, title }),
      ...prev,
    ];
  });
};
