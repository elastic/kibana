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
import type {
  ConversationInternalState,
  ConversationRoundStatus,
} from '@kbn/agent-builder-common/chat';
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
      conversation_rounds: types.object({
        dynamic: false,
        properties: {
          id: types.keyword({}),
          status: types.keyword({}),
          started_at: types.date({}),
          time_to_first_token: types.long({}),
          time_to_last_token: types.long({}),
          trace_id: types.keyword({}),
          input: types.object({
            dynamic: false,
            properties: {
              message: types.text({}),
            },
          }),
          response: types.object({
            dynamic: false,
            properties: {
              message: types.text({}),
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
        },
      }),
      attachments: types.object({
        dynamic: false,
        properties: {
          id: types.keyword({}),
          type: types.keyword({}),
          versions: types.object({
            dynamic: false,
            properties: {
              version: types.long({}),
              created_at: types.date({}),
              content_hash: types.keyword({}),
            },
          }),
          origin: types.keyword({}),
          current_version: types.long({}),
          active: types.boolean({}),
          hidden: types.boolean({}),
        },
      }),
      state: types.object({ dynamic: false, properties: {} }),
      status: types.keyword({}),
      read: types.boolean({}),
      workspace_id: types.keyword({}),
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
  status?: ConversationRoundStatus;
  read?: boolean;
  workspace_id?: string;
  // legacy field
  rounds?: PersistentConversationRound[];
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
