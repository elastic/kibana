/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, InternalIStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/agent-builder-server';

const sessionIndexName = chatSystemIndex('cli-sessions');

const storageSettings = {
  name: sessionIndexName,
  schema: {
    properties: {
      user_name: types.keyword({}),
      space: types.keyword({}),
      skill_id: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      attachments: types.object({ dynamic: false, properties: {} }),
    },
  },
} satisfies IndexStorageSettings;

export interface SessionDocument {
  _id?: string;
  user_name?: string;
  space?: string;
  skill_id?: string;
  created_at?: string;
  updated_at?: string;
  attachments?: unknown[];
}

type SessionStorageSettings = typeof storageSettings;

export type SessionStorageClient = InternalIStorageClient<SessionDocument>;

export const createSessionStorage = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): SessionStorageClient => {
  const adapter = new StorageIndexAdapter<SessionStorageSettings, SessionDocument>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
