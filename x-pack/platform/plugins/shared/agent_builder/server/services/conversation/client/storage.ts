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
import type {
  ConversationChatMode,
  TemplateSnapshot,
} from '@kbn/agent-builder-common/chat/conversation_metadata';
import type { ConversationMode } from '@kbn/agent-builder-common/chat/collaboration';
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
      template_id: types.keyword({}),
      template_snapshot: types.object({ dynamic: false, properties: {} }),
      /** Denormalized from template_snapshot for list queries (collaborative ⇒ team-visible). */
      chat_mode: types.keyword({}),
      custom_fields: types.object({ dynamic: true, properties: {} }),
      events: types.object({ dynamic: true, properties: {} }),
      conversation_mode: types.keyword({}),
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
  template_id?: string;
  template_snapshot?: TemplateSnapshot;
  /** Denormalized from template_snapshot.chat_mode for list queries. */
  chat_mode?: ConversationChatMode;
  custom_fields?: Record<string, unknown>;
  events?: TimelineEvent[];
  conversation_mode?: ConversationMode;
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
