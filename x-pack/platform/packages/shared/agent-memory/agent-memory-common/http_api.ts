/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryWorkflowType } from './constants';
import type { MemorySearchMode } from './search_modes';
import type {
  MemoryCategoryNode,
  MemoryEntry,
  MemorySearchResult,
  MemoryVersionRecord,
} from './types';

export interface CreateMemoryEntryRequest {
  name: string;
  title: string;
  content: string;
  categories?: string[];
  references?: string[];
  tags?: string[];
}

export interface UpdateMemoryEntryRequest {
  name?: string;
  title?: string;
  content?: string;
  categories?: string[];
  references?: string[];
  tags?: string[];
  change_summary?: string;
}

export interface SearchMemoryRequest {
  query: string;
  tags?: string[];
  categories?: string[];
  references?: string[];
  size?: number;
  mode?: MemorySearchMode;
}

export interface SearchMemoryResponse {
  results: MemorySearchResult[];
}

export interface MemoryCategoriesResponse {
  tree: MemoryCategoryNode[];
  uncategorized: Array<{ id: string; name: string; title: string }>;
}

export interface MemoryHistoryResponse {
  history: MemoryVersionRecord[];
}

export interface MemoryRecentChangesResponse {
  changes: MemoryVersionRecord[];
}

export type MemoryEntryResponse = MemoryEntry;

/**
 * Why memory cannot be used at all, as opposed to merely not being installed yet.
 */
export type MemoryUnavailableReason = 'plugin_disabled' | 'workflows_unavailable' | 'license';

/**
 * Lifecycle of the memory feature in this deployment.
 *
 * - `unavailable`     — cannot be used: disabled, unlicensed, or a dependency is missing
 * - `not_installed`   — available but never set up
 * - `installing`      — a setup is in flight, or Kibana has not finished installing
 * - `partially_ready` — storage exists but not every curation workflow is installed and enabled
 * - `ready`           — fully set up
 */
export type MemoryState =
  | 'unavailable'
  | 'not_installed'
  | 'installing'
  | 'partially_ready'
  | 'ready';

export interface MemoryWorkflowStatus {
  type: MemoryWorkflowType;
  installed: boolean;
  enabled: boolean;
  /** Last enable/disable failure for this workflow specifically. */
  failure?: string;
  lastRun?: {
    status: 'running' | 'completed' | 'failed';
    startedAt: string;
    executionId: string;
  };
}

export interface MemoryStatusResponse {
  state: MemoryState;
  /** Set when `state` is `unavailable`. */
  reason?: MemoryUnavailableReason;
  storage: {
    installed: boolean;
    dataStreams: Array<{ name: string; installed: boolean }>;
  };
  maintenance: {
    /** True when every curation workflow is installed and enabled. */
    enabled: boolean;
    workflows: MemoryWorkflowStatus[];
  };
  capabilities: {
    canManage: boolean;
  };
}

/**
 * Result of a setup or maintenance-toggle call.
 *
 * These always resolve with the resulting status rather than failing the whole
 * request when one workflow lags behind: an ordinary post-restart race should
 * not look like a hard error.
 */
export interface MemorySetupResponse {
  status: MemoryStatusResponse;
  warnings: string[];
}

export interface MemoryMaintenanceToggleResponse {
  status: MemoryStatusResponse;
  failures: Array<{ type: MemoryWorkflowType; message: string }>;
}

export interface MemoryWorkflowRunResponse {
  executionId: string;
}
