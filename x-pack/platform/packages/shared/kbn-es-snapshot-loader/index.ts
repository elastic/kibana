/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { restoreSnapshot } from './src/restore';
export { replaySnapshot } from './src/replay';
export { type RestoreConfig, type ReplayConfig, type LoadResult } from './src/types';
export {
  createUrlRepository,
  createGcsRepository,
  type RepositoryType,
  type RepositoryStrategy,
  type GcsRepositoryConfig,
} from './src/repository';
