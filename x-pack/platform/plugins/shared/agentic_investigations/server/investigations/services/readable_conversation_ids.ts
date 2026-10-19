/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRoundsWithPermissions } from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { retryWhileShardUnavailable } from '../../investigation_attachments';

/** Ids one `bulkGet` reads, so a long id list never becomes one oversized search. */
export const READABLE_CONVERSATIONS_CHUNK_SIZE = 1000;

/**
 * The conversations the caller of `client` can read, keyed by id. `bulkGet` applies Agent
 * Builder's access control (owner, public, or ACL member), so ids of conversations the caller
 * cannot read, or that do not exist, are absent.
 */
export const bulkGetReadableConversations = async (
  client: Pick<ConversationPublicClient, 'bulkGet'>,
  conversationIds: readonly string[]
): Promise<Map<string, ConversationWithoutRoundsWithPermissions>> => {
  const uniqueIds = [...new Set(conversationIds)];
  const readable = new Map<string, ConversationWithoutRoundsWithPermissions>();
  for (let i = 0; i < uniqueIds.length; i += READABLE_CONVERSATIONS_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + READABLE_CONVERSATIONS_CHUNK_SIZE);
    const conversations = await retryWhileShardUnavailable(() => client.bulkGet(chunk));
    for (const [id, conversation] of conversations) {
      readable.set(id, conversation);
    }
  }
  return readable;
};

/**
 * The ids, in their order and without duplicates, of the conversations the caller of `client`
 * can read. Side-index reads run as the internal user, so callers that take conversation ids
 * from their own caller filter them through this first.
 */
export const filterReadableConversationIds = async (
  client: Pick<ConversationPublicClient, 'bulkGet'>,
  conversationIds: readonly string[]
): Promise<string[]> => {
  const readable = await bulkGetReadableConversations(client, conversationIds);
  return [...new Set(conversationIds)].filter((id) => readable.has(id));
};
