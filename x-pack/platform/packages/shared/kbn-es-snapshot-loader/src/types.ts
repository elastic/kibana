/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RepositoryStrategy } from './repository/types';

// Snapshot metadata
export interface SnapshotInfo {
  snapshot: string;
  indices: string[];
  startTime: string;
  endTime: string;
  state: string;
}

// Base configuration shared by both operations
interface BaseConfig {
  esClient: Client;
  log: ToolingLog;
  repository: RepositoryStrategy;
  // If omitted, the loader will select the latest SUCCESS snapshot in the repository.
  snapshotName?: string;
}

// Restore configuration
export interface RestoreConfig extends BaseConfig {
  indices?: string[];
}

// Replay configuration
export interface ReplayConfig extends BaseConfig {
  patterns: string[];
  concurrency?: number;
}

// Unified result type (ReplayResult is superset of RestoreResult)
export interface LoadResult {
  success: boolean;
  snapshotName: string;
  restoredIndices: string[];
  errors: string[];
  reindexedIndices?: string[];
  maxTimestamp?: string;
}
