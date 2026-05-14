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

export type SidebarConversationListRow = ConversationWithoutRounds & {
  _isOptimistic?: boolean;
};

const buildSidebarConversationListRow = (p: {
  id: string;
  agent_id: string;
  title: string;
}): SidebarConversationListRow => {
  const t = new Date().toISOString();
  return {
    id: p.id,
    agent_id: p.agent_id,
    user: { id: '', username: '' },
    title: p.title,
    created_at: t,
    updated_at: t,
    _isOptimistic: true,
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
  queryClient.setQueryData<SidebarConversationListRow[] | undefined>(key, (prev) => {
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
  queryClient.setQueryData<SidebarConversationListRow[] | undefined>(key, (prev) => {
    if (!prev?.length) {
      return prev;
    }
    return prev.filter((c) => c.id !== conversationId);
  });
};

export const isConversationPersisted = (conversation: ConversationWithoutRounds): boolean =>
  !(conversation as SidebarConversationListRow)._isOptimistic;
