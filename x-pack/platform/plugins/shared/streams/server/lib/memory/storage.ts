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
import type { MemoryEntry } from './types';

export const memoryIndexName = chatSystemIndex('memory');

const storageSettings = {
  name: memoryIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      name: types.keyword({}),
      title: types.text({}),
      content: types.text({}),
      categories: types.keyword({}),
      references: types.keyword({}),
      version: types.long({}),
      tags: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      created_by: types.keyword({}),
      updated_by: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export type MemoryStorageSettings = typeof storageSettings;

export type MemoryStorage = StorageIndexAdapter<MemoryStorageSettings, MemoryEntry>;

export const createMemoryStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): MemoryStorage => {
  return new StorageIndexAdapter<MemoryStorageSettings, MemoryEntry>(
    esClient,
    logger,
    storageSettings
  );
};
