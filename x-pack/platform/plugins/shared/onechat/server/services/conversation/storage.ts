/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { IndexStorageSettings, StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { ConversationRound } from '@kbn/onechat-common';

export const conversationIndexName = '.kibana_onechat_conversations';

const storageSettings = {
  name: conversationIndexName,
  schema: {
    properties: {
      user_id: types.keyword({}),
      user_name: types.keyword({}),
      agent_id: types.keyword({}),
      title: types.text({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      rounds: types.object({ dynamic: true }),
    },
  },
} satisfies IndexStorageSettings;

export interface ConversationProperties {
  user_id: string;
  user_name: string;
  agent_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  rounds: ConversationRound[];
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
