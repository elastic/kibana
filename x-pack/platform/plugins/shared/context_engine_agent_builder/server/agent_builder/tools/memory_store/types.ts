/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexDest } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import type {
  KiRevisionChanges,
  StoredKi,
} from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import type { ElasticsearchClient } from '@kbn/core/server';

/** A stored memory as read by a {@link MemoryStore}. Stores may attach their own fields. */
export interface MemoryRevision {
  source: StoredKi;
}

/** Persists the memory KIs written by the remember and forget tools. */
export interface MemoryStore {
  /** Throws `KiNotFoundError` when the memory does not exist. */
  get(kiId: string): Promise<MemoryRevision>;
  /** Creates the memory when `existing` is omitted, otherwise replaces that revision. */
  put(params: { kiId: string; document: StoredKi; existing?: MemoryRevision }): Promise<void>;
  /** Records `changes` (a deleted lifecycle status) on top of `existing`. */
  markDeleted(params: {
    kiId: string;
    existing: MemoryRevision;
    changes: KiRevisionChanges;
  }): Promise<void>;
}

export interface MemoryStoreScope {
  aiIndexId: string;
  dest: AiIndexDest;
  spaceId: string;
  esClient: ElasticsearchClient;
}

export type CreateMemoryStore = (scope: MemoryStoreScope) => MemoryStore;

/** A memory returned by {@link MemorySearch}, identified by the KI id that remember returned. */
export interface RecalledMemory {
  id: string;
  type?: string;
  title?: string;
  text: string;
  similarity: number;
}

/** Searches active, unexpired memories by meaning. */
export interface MemorySearch {
  search(params: { query: string; limit: number }): Promise<RecalledMemory[]>;
}

export type CreateMemorySearch = (scope: MemoryStoreScope) => MemorySearch;
