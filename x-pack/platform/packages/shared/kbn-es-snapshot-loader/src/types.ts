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
  /**
   * Optional index rename during restore. This is useful to restore into a
   * temporary location to avoid clobbering existing indices.
   *
   * Both values must be provided to enable renaming.
   */
  renamePattern?: string;
  renameReplacement?: string;
  /**
   * When true, a restore that matches no indices is treated as a successful
   * no-op (restoring nothing) instead of an error.
   */
  allowNoMatches?: boolean;
}

// Replay configuration
export interface ReplayConfig extends BaseConfig {
  patterns: string[];
  concurrency?: number;
  /** Predicate that determines whether a given destination index should use an inline
   * Painless script instead of the ingest pipeline for timestamp transformation. Return
   * `true` for destinations whose index templates are managed externally and reject
   * explicit pipelines in bulk/reindex requests. */
  shouldUseInlineScript?: (destIndex: string) => boolean;
  /** Called after temp indices are restored, before reindexing to final destinations. */
  beforeReindex?: (params: {
    esClient: Client;
    log: ToolingLog;
    originalIndices: string[];
    restoredIndices: string[];
    destinationIndices: string[];
  }) => Promise<void>;
}

// Create configuration
export interface CreateConfig extends Omit<BaseConfig, 'snapshotName'> {
  snapshotName: string;
  indices?: string[];
  ignoreUnavailable?: boolean;
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

export interface CreateResult {
  success: boolean;
  snapshotName: string;
  indices: string[];
  errors: string[];
}
