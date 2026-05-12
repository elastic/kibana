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
import type { MemoryVersionRecord } from './types';

export const memoryHistoryIndexName = chatSystemIndex('memhistory');

const storageSettings = {
  name: memoryHistoryIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      entry_id: types.keyword({}),
      version: types.long({}),
      name: types.keyword({}),
      title: types.text({}),
      content: types.text({}),
      change_type: types.keyword({}),
      change_summary: types.text({}),
      created_at: types.date({}),
      created_by: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export type MemoryHistoryStorageSettings = typeof storageSettings;

export type MemoryHistoryStorage = StorageIndexAdapter<
  MemoryHistoryStorageSettings,
  MemoryVersionRecord
>;

export const createMemoryHistoryStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): MemoryHistoryStorage => {
  return new StorageIndexAdapter<MemoryHistoryStorageSettings, MemoryVersionRecord>(
    esClient,
    logger,
    storageSettings
  );
};
