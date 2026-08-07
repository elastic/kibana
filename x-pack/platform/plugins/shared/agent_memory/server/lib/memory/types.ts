/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MemoryCategoryNode,
  MemoryEntry,
  MemorySearchMode,
  MemorySearchResult,
  MemoryVersionRecord,
} from '@kbn/agent-memory-common';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

/** Parameters for creating a memory entry */
export interface CreateMemoryParams {
  name: string;
  title: string;
  content: string;
  categories?: string[];
  references?: string[];
  tags?: string[];
  user: string;
}

/** Parameters for updating a memory entry */
export interface UpdateMemoryParams {
  id: string;
  content?: string;
  title?: string;
  name?: string;
  categories?: string[];
  references?: string[];
  tags?: string[];
  user: string;
  changeSummary?: string;
}

/** Parameters for searching memory */
export interface SearchMemoryParams {
  query: string;
  tags?: string[];
  categories?: string[];
  references?: string[];
  size?: number;
  mode?: MemorySearchMode;
}

/** Dependencies for the memory service */
export interface MemoryServiceDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
}

/**
 * Memory service interface — manages the persistent knowledge base.
 *
 * Memory is global (space-agnostic). Pages are organized via categories
 * (Wikipedia-style) rather than a fixed path hierarchy.
 */
export interface MemoryService {
  // CRUD
  create(params: CreateMemoryParams): Promise<MemoryEntry>;
  get(params: { id: string }): Promise<MemoryEntry>;
  getByName(params: { name: string }): Promise<MemoryEntry | undefined>;
  update(params: UpdateMemoryParams): Promise<MemoryEntry>;
  delete(params: { id: string; user: string }): Promise<void>;

  // Categories
  getCategoryTree(): Promise<{
    tree: MemoryCategoryNode[];
    uncategorized: Array<{ id: string; name: string; title: string }>;
  }>;

  // Search & browse
  search(params: SearchMemoryParams): Promise<MemorySearchResult[]>;
  listAll(): Promise<MemoryEntry[]>;
  listByCategory(params: { category: string }): Promise<MemoryEntry[]>;

  // History
  getHistory(params: { entryId: string; size?: number }): Promise<MemoryVersionRecord[]>;
  getVersion(params: { entryId: string; version: number }): Promise<MemoryVersionRecord>;

  // Recent changes across all entries
  getRecentChanges(params: { size?: number }): Promise<MemoryVersionRecord[]>;
}
