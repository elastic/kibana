/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { MemoryType } from '../../common/types';

const memoryStorageSettings = {
  name: '.kibana-knowledge-mining-memories',
  schema: {
    properties: {
      path: types.keyword({}),
      directory: types.keyword({}),
      title: types.text({}),
      content: types.text({}),
      memory_type: types.keyword({}),
      tags: types.keyword({}),
      space: types.keyword({}),
      created_by: types.keyword({}),
      updated_by: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      source_conversation_ids: types.keyword({}),
      version: types.long({}),
    },
  },
} satisfies IndexStorageSettings;

export interface MemoryProperties {
  path: string;
  directory: string;
  title: string;
  content: string;
  memory_type: MemoryType;
  tags: string[];
  space: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  source_conversation_ids: string[];
  version: number;
}

export type MemoryStorageSettings = typeof memoryStorageSettings;

export type MemoryStorage = StorageIndexAdapter<MemoryStorageSettings, MemoryProperties>;

export const createMemoryStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): MemoryStorage => {
  return new StorageIndexAdapter<MemoryStorageSettings, MemoryProperties>(
    esClient,
    logger,
    memoryStorageSettings
  );
};
