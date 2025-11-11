/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';

export interface CheckpointStorageOptions {
  /**
   * Index name prefix for checkpoint indices.
   * Examples: '.chat-', '.observability-', '.security-'
   */
  indexPrefix: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}

export const getCheckpointsIndexName = (prefix: string): string => {
  return `${prefix}checkpoints`;
};

export const getCheckpointWritesIndexName = (prefix: string): string => {
  return `${prefix}checkpoint-writes`;
};

const createCheckpointsStorageSettings = (indexName: string) => {
  return {
    name: indexName,
    schema: {
      properties: {
        '@timestamp': types.date({}),
        thread_id: types.keyword({}),
        checkpoint_ns: types.keyword({}),
        checkpoint_id: types.keyword({}),
        parent_checkpoint_id: types.keyword({}),
        type: types.keyword({}),
        checkpoint: types.binary({}),
        metadata: types.binary({}),
      },
    },
  } satisfies IndexStorageSettings;
};

const createCheckpointWritesStorageSettings = (indexName: string) => {
  return {
    name: indexName,
    schema: {
      properties: {
        '@timestamp': types.date({}),
        thread_id: types.keyword({}),
        checkpoint_ns: types.keyword({}),
        checkpoint_id: types.keyword({}),
        task_id: types.keyword({}),
        idx: types.long({}),
        channel: types.keyword({}),
        type: types.keyword({}),
        value: types.binary({}),
      },
    },
  } satisfies IndexStorageSettings;
};

export interface CheckpointProperties {
  '@timestamp': string;
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  parent_checkpoint_id: string;
  type: string;
  checkpoint: string;
  metadata: string;
}

export interface CheckpointWriteProperties {
  '@timestamp': string;
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  task_id: string;
  idx: number;
  channel: string;
  type: string;
  value: string;
}

export type CheckpointsStorage = StorageIndexAdapter<
  ReturnType<typeof createCheckpointsStorageSettings>,
  CheckpointProperties
>;

export type CheckpointWritesStorage = StorageIndexAdapter<
  ReturnType<typeof createCheckpointWritesStorageSettings>,
  CheckpointWriteProperties
>;

export const createCheckpointsStorage = ({
  indexPrefix,
  logger,
  esClient,
}: CheckpointStorageOptions): CheckpointsStorage => {
  const indexName = getCheckpointsIndexName(indexPrefix);
  const storageSettings = createCheckpointsStorageSettings(indexName);
  return new StorageIndexAdapter(esClient, logger, storageSettings);
};

export const createCheckpointWritesStorage = ({
  indexPrefix,
  logger,
  esClient,
}: CheckpointStorageOptions): CheckpointWritesStorage => {
  const indexName = getCheckpointWritesIndexName(indexPrefix);
  const storageSettings = createCheckpointWritesStorageSettings(indexName);
  return new StorageIndexAdapter(esClient, logger, storageSettings);
};

