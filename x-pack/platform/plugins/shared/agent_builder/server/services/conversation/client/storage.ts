/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { Optional } from '@kbn/utility-types';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type {
  ConversationAccessControl,
  ConversationInternalState,
  ConversationRoundStatus,
  ConversationOrigin,
  TimelineEvent,
  ActiveExecution,
} from '@kbn/agent-builder-common/chat';
import type { SerializedMetadataValue } from '@kbn/agent-builder-common';
import type {
  ConversationPinnedByEntry,
  ConversationReadByEntry,
  PersistentConversationRound,
} from './types';

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
          feedback: types.object({
            dynamic: false,
            properties: {
              vote: types.keyword({}),
              chips: types.keyword({}),
              comment: types.text({}),
              submitted_at: types.date({}),
              connector_id: types.keyword({}),
              model: types.keyword({}),
            },
          }),
        },
      }),
      events: types.nested({
        properties: {
          id: types.keyword({}),
          type: types.keyword({}),
          created_at: types.date({}),
          execution_id: types.keyword({}),
          trigger_event_id: types.keyword({}),
          actor: types.object({
            dynamic: false,
            properties: {
              type: types.keyword({}),
              id: types.keyword({}),
            },
          }),
          data: types.object({ dynamic: false, properties: {} }),
        },
      }),
      active_execution: types.object({
        dynamic: false,
        properties: {
          execution_id: types.keyword({}),
          trigger_event_id: types.keyword({}),
          started_at: types.date({}),
        },
      }),
      schema_version: types.long({}),
      attachments: types.object({ dynamic: false, properties: {} }),
      state: types.object({ dynamic: false, properties: {} }),
      status: types.keyword({}),
      // legacy field, superseded by read_by
      read: types.boolean({}),
      read_by: types.nested({
        properties: {
          userId: types.keyword({}),
        },
        dynamic: false,
      }),
      // legacy field, superseded by pinned_by
      pinned: types.boolean({}),
      pinned_by: types.nested({
        properties: {
          userId: types.keyword({}),
        },
        dynamic: false,
      }),
      read_only: types.boolean({}),
      workspace_id: types.keyword({}),
      parent_conversation: types.object({
        dynamic: false,
        properties: {
          id: types.keyword({}),
          relation: types.keyword({}),
        },
      }),
      access_control: types.object({
        properties: {
          access_mode: types.keyword({}),
          entries: types.nested({
            properties: {
              type: types.keyword({}),
              id: types.keyword({}),
              role: types.keyword({}),
              added_at: types.date({}),
            },
          }),
        },
        dynamic: false,
      }),
      origin: types.object({
        properties: {
          external_conversation_id: types.keyword({}),
        },
        dynamic: false,
      }),
      metadata: types.flattened({}),
      template_id: types.keyword({}),
      template_version: types.long({}),
    },
  },
} satisfies IndexStorageSettings;

/**
 * Persistent shape of the parent-conversation link.
 */
export interface PersistentConversationParentLink {
  id: string;
  relation: string;
}

export interface ConversationProperties {
  user_id?: string;
  user_name: string;
  agent_id: string;
  space: string;
  title: string;
  created_at: string;
  updated_at: string;
  conversation_rounds: PersistentConversationRound[];
  events?: TimelineEvent[];
  active_execution?: ActiveExecution;
  schema_version?: number;
  attachments?: VersionedAttachment[];
  state?: ConversationInternalState;
  status?: ConversationRoundStatus;
  // legacy field, superseded by read_by
  read?: boolean;
  read_by?: ConversationReadByEntry[];
  // legacy field, superseded by pinned_by
  pinned?: boolean;
  pinned_by?: ConversationPinnedByEntry[];
  read_only?: boolean;
  workspace_id?: string;
  access_control?: Optional<ConversationAccessControl, 'entries'>;
  parent_conversation?: PersistentConversationParentLink;
  origin?: ConversationOrigin;
  metadata?: Record<string, SerializedMetadataValue>;
  template_id?: string;
  template_version?: number;
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
