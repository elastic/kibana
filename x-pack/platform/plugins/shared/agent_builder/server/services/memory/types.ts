/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

/**
 * A memory entry as stored in the main memory index.
 */
export interface MemoryEntry {
  /** Unique ID */
  id: string;
  /** Wiki-style path, e.g. "ops/runbooks/deploy-checklist" */
  path: string;
  /** Human-readable title */
  title: string;
  /** Markdown content */
  content: string;
  /** Parent directory path, e.g. "ops/runbooks" */
  parent_path: string;
  /** Space ID */
  space: string;
  /** Monotonically increasing version per entry */
  version: number;
  /** Tags for classification */
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

/**
 * A version history record for a memory entry.
 */
export interface MemoryVersionRecord {
  id: string;
  entry_id: string;
  version: number;
  path: string;
  title: string;
  content: string;
  change_type: MemoryChangeType;
  change_summary: string;
  space: string;
  created_at: string;
  created_by: string;
}

export type MemoryChangeType = 'create' | 'update' | 'delete' | 'move';

/**
 * A compaction log entry tracking multi-entry restructuring operations.
 */
export interface CompactionLogEntry {
  id: string;
  operation: CompactionOperation;
  affected_entries: string[];
  summary: string;
  space: string;
  created_at: string;
  created_by: string;
  source_conversation_id?: string;
}

export type CompactionOperation = 'compact' | 'merge' | 'split' | 'reorganize';

/**
 * A node in the memory tree hierarchy.
 */
export interface MemoryTreeNode {
  path: string;
  title: string;
  id?: string;
  has_children: boolean;
  children: MemoryTreeNode[];
}

/**
 * A memory search result with relevance score.
 */
export interface MemorySearchResult {
  id: string;
  path: string;
  title: string;
  snippet: string;
  score: number;
  updated_at: string;
  updated_by: string;
  tags: string[];
}

/** Parameters for creating a memory entry */
export interface CreateMemoryParams {
  path: string;
  title: string;
  content: string;
  tags?: string[];
  space: string;
  user: string;
}

/** Parameters for updating a memory entry */
export interface UpdateMemoryParams {
  id: string;
  content?: string;
  title?: string;
  tags?: string[];
  path?: string;
  space: string;
  user: string;
  changeSummary?: string;
}

/** Parameters for searching memory */
export interface SearchMemoryParams {
  query: string;
  space: string;
  tags?: string[];
  parentPath?: string;
  size?: number;
}

/** Parameters for recording a compaction operation */
export interface CompactMemoryParams {
  entryIds: string[];
  operation: CompactionOperation;
  summary: string;
  space: string;
  user: string;
  conversationId?: string;
}

/** Dependencies for the memory service */
export interface MemoryServiceDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
}

/**
 * Memory service interface — manages the persistent knowledge base.
 */
export interface MemoryService {
  // CRUD
  create(params: CreateMemoryParams): Promise<MemoryEntry>;
  get(params: { id: string; space: string }): Promise<MemoryEntry>;
  getByPath(params: { path: string; space: string }): Promise<MemoryEntry | undefined>;
  update(params: UpdateMemoryParams): Promise<MemoryEntry>;
  delete(params: { id: string; space: string; user: string }): Promise<void>;
  move(params: { id: string; newPath: string; space: string; user: string }): Promise<MemoryEntry>;

  // Search & browse
  search(params: SearchMemoryParams): Promise<MemorySearchResult[]>;
  listChildren(params: { parentPath: string; space: string }): Promise<MemoryEntry[]>;
  listAll(params: { space: string }): Promise<MemoryEntry[]>;
  getTree(params: { space: string }): Promise<MemoryTreeNode[]>;

  // History
  getHistory(params: {
    entryId: string;
    space: string;
    size?: number;
  }): Promise<MemoryVersionRecord[]>;
  getVersion(params: {
    entryId: string;
    version: number;
    space: string;
  }): Promise<MemoryVersionRecord>;
  rollback(params: {
    entryId: string;
    version: number;
    space: string;
    user: string;
  }): Promise<MemoryEntry>;

  // Compaction
  compact(params: CompactMemoryParams): Promise<void>;
  getCompactionLog(params: { space: string; size?: number }): Promise<CompactionLogEntry[]>;
}
