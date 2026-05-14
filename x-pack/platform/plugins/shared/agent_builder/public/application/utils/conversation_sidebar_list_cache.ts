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

export const buildSidebarConversationListRow = (p: {
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
  row,
}: {
  queryClient: QueryClient;
  agentId: string;
  row: ConversationWithoutRounds;
}): Promise<boolean> => {
  const key = agentConversationListKey(agentId);
  await queryClient.cancelQueries({ queryKey: key });
  const cur = queryClient.getQueryData<ConversationWithoutRounds[]>(key);
  if (cur?.some((c) => c.id === row.id)) {
    return false;
  }
  queryClient.setQueryData<ConversationWithoutRounds[]>(key, [row, ...(cur ?? [])]);
  return true;
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
  const cur = queryClient.getQueryData<ConversationWithoutRounds[]>(key);
  if (cur === undefined) {
    return;
  }
  queryClient.setQueryData<ConversationWithoutRounds[]>(
    key,
    cur.filter((c) => c.id !== conversationId)
  );
};

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
  const cur = queryClient.getQueryData<ConversationWithoutRounds[]>(key);
  if (!cur?.length) {
    return;
  }
  const i = cur.findIndex((c) => c.id === conversationId);
  if (i === -1) {
    return;
  }
  const updatedAt = new Date().toISOString();
  queryClient.setQueryData<ConversationWithoutRounds[]>(
    key,
    cur.map((c, j) => (j === i ? { ...c, title, updated_at: updatedAt } : c))
  );
};

export const isServerBackedConversationListRow = (c: ConversationWithoutRounds): boolean =>
  Boolean(c.user?.username?.trim());
