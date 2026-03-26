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
  ConversationExecutionState,
  TimelineEvent,
} from '@kbn/agent-builder-common/chat';
import type { ConversationMode } from '@kbn/agent-builder-common';
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
      conversation_rounds: types.object({ dynamic: false, properties: {} }),
      attachments: types.object({ dynamic: false, properties: {} }),
      state: types.object({ dynamic: false, properties: {} }),
      // New fields for timeline-based conversations
      events: types.object({ dynamic: false, properties: {} }),
      conversation_mode: types.keyword({}),
      execution_state: types.keyword({}),
      queued_trigger: types.keyword({}),
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
  conversation_mode?: ConversationMode;
  execution_state?: ConversationExecutionState;
  queued_trigger?: string;
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
