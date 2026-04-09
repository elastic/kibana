/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ConversationInternalState, TimelineEvent } from '@kbn/agent-builder-common/chat';
import type { PersistentConversationRound } from './types';

export const conversationIndexName = chatSystemIndex('conversations');

const storageSettings = {
  name: conversationIndexName,
  schema: {
    properties: {
      user_id: types.keyword({}),
      user_name: types.keyword({}),
      agent_id: types.keyword({}),
      space: types.keyword({}),
      title: types.text({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      attachments: types.object({ dynamic: false, properties: {} }),
      state: types.object({ dynamic: false, properties: {} }),
      events: types.nested({
        dynamic: false,
        properties: {
          // common
          id: types.keyword({}),
          timestamp: types.date({}),
          type: types.keyword({}),
          // type: user_message
          message: types.text({}),
          // type: agent_response
          status: types.keyword({}),
          started_at: types.date({}),
          time_to_first_token: types.long({}),
          time_to_last_token: types.long({}),
          trace_id: types.keyword({}),
          steps: types.object({
            dynamic: false,
            properties: {
              type: types.keyword({}),
              // tool call steps
              tool_call_id: types.keyword({}),
              tool_id: types.keyword({}),
              tool_call_group_id: types.keyword({}),
              // reasoning steps
              reasoning: types.text({}),
              // compaction steps
              summarized_round_count: types.long({}),
              token_count_before: types.long({}),
              token_count_after: types.long({}),
            },
          }),
          model_usage: types.object({
            dynamic: false,
            properties: {
              connector_id: types.keyword({}),
              llm_calls: types.long({}),
              input_tokens: types.long({}),
              output_tokens: types.long({}),
              model: types.keyword({}),
            },
          }),
        },
      }),
      conversation_mode: types.keyword({}),
      execution_state: types.keyword({}),
      // deprecated
      conversation_rounds: types.object({ dynamic: false, properties: {} }),
    },
  },
} satisfies IndexStorageSettings;

export interface ConversationProperties {
  user_id?: string;
  user_name: string;
  agent_id: string;
  space: string;
  title: string;
  created_at: string;
  updated_at: string;
  conversation_rounds: PersistentConversationRound[];
  attachments?: VersionedAttachment[];
  state?: ConversationInternalState;
  // legacy field
  rounds?: PersistentConversationRound[];
  // New timeline-based fields
  events?: TimelineEvent[];
}

export type ConversationStorageSettings = typeof storageSettings;

export type ConversationStorage = StorageIndexAdapter<
  ConversationStorageSettings,
  ConversationProperties
>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): ConversationStorage => {
  return new StorageIndexAdapter<ConversationStorageSettings, ConversationProperties>(
    esClient,
    logger,
    storageSettings
  );
};
