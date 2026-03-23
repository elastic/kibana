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
import type { CompactionLogEntry } from './types';

export const compactionLogIndexName = chatSystemIndex('memory-compaction-log');

const storageSettings = {
  name: compactionLogIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      operation: types.keyword({}),
      affected_entries: types.keyword({}),
      summary: types.text({}),
      space: types.keyword({}),
      created_at: types.date({}),
      created_by: types.keyword({}),
      source_conversation_id: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export type CompactionLogStorageSettings = typeof storageSettings;

export type CompactionLogStorage = StorageIndexAdapter<
  CompactionLogStorageSettings,
  CompactionLogEntry
>;

export const createCompactionLogStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): CompactionLogStorage => {
  return new StorageIndexAdapter<CompactionLogStorageSettings, CompactionLogEntry>(
    esClient,
    logger,
    storageSettings
  );
};
