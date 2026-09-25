/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { EsClient } from '@kbn/scout';
import { API_AGENT_BUILDER, CHAT_CONVERSATIONS_INDEX } from './constants';
import { AGENT_BUILDER_PUBLIC_API_HEADERS } from './kbn_public_api_headers';

export async function deleteAllConversationsFromEs(esClient: EsClient): Promise<void> {
  await esClient.deleteByQuery({
    index: CHAT_CONVERSATIONS_INDEX,
    query: { match_all: {} },
    wait_for_completion: true,
    refresh: true,
    conflicts: 'proceed',
    ignore_unavailable: true,
  });
}

/** Deletes only the given conversation ids. Missing ids are ignored. */
export async function deleteConversationsByIds(
  kbnClient: KbnClient,
  conversationIds: readonly string[]
): Promise<void> {
  await Promise.allSettled(
    conversationIds.map((conversationId) =>
      kbnClient.request({
        method: 'DELETE',
        path: `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
        headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
        ignoreErrors: [404],
      })
    )
  );
}
