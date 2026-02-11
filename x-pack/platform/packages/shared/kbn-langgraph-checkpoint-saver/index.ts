/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ElasticSearchSaver } from './server/elastic-search-checkpoint-saver';
export type { ElasticSearchSaverParams } from './server/elastic-search-checkpoint-saver';

export {
  createCheckpointerClient,
  CheckpointerServiceImpl,
  createCheckpointsStorage,
  createCheckpointWritesStorage,
  getCheckpointsIndexName,
  getCheckpointWritesIndexName,
} from './server/storage-adapter-checkpoint-saver';
export type {
  CreateCheckpointerClientOptions,
  CheckpointerService,
  CheckpointerServiceOptions,
  CheckpointStorageOptions,
  CheckpointProperties,
  CheckpointWriteProperties,
  CheckpointsStorage,
  CheckpointWritesStorage,
} from './server/storage-adapter-checkpoint-saver';
