/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ConversationRound, VersionedAttachment } from '@kbn/agent-builder-common';
import { chatSystemIndex } from '@kbn/agent-builder-server';

const CONVERSATION_INDEX_ALIAS = chatSystemIndex('conversations');

/**
 * The Elasticsearch document shape for conversations, matching the schema
 * that agent_builder reads and writes. Tool call results within rounds
 * must be serialized to JSON strings before storage.
 */
export interface ConversationDocument {
  user_id?: string;
  user_name: string;
  agent_id: string;
  space: string;
  title: string;
  created_at: string;
  updated_at: string;
  conversation_rounds: ConversationRound[];
  attachments?: VersionedAttachment[];
  state?: Record<string, unknown>;
}

/**
 * Creates a thin conversation client that reads/writes directly to the
 * agent_builder conversation index alias. This avoids duplicating the
 * StorageIndexAdapter schema — agent_builder owns the index lifecycle,
 * and elastic_console piggybacks on the alias it creates.
 */
export const createConversationClient = (esClient: ElasticsearchClient) => ({
  /** Check whether the backing index exists (alias is resolvable). */
  indexExists: async (): Promise<boolean> => {
    return esClient.indices.existsAlias({ name: CONVERSATION_INDEX_ALIAS });
  },

  search: (params: Omit<SearchRequest, 'index'>) =>
    esClient.search<ConversationDocument>({ ...params, index: CONVERSATION_INDEX_ALIAS }),

  index: (params: { id: string; document: ConversationDocument }) =>
    esClient.index({
      index: CONVERSATION_INDEX_ALIAS,
      id: params.id,
      document: params.document,
      require_alias: true,
    }),

  get: (params: { id: string }) =>
    esClient.search<ConversationDocument>({
      index: CONVERSATION_INDEX_ALIAS,
      size: 1,
      terminate_after: 1,
      query: { term: { _id: params.id } },
    }),
});

export type ConversationClient = ReturnType<typeof createConversationClient>;
