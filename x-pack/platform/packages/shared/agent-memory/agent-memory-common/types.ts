/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A memory page.
 *
 * Pages have stable UUIDs and mutable names. Organization is via categories
 * (Wikipedia-style, many-to-many) rather than a fixed path hierarchy.
 */
export interface MemoryEntry {
  /** Stable UUID — never changes once created */
  id: string;
  /** Human-readable unique name (mutable). Used for display and lookup. */
  name: string;
  /** Human-readable title */
  title: string;
  /** Markdown content */
  content: string;
  /** Categories this page belongs to (e.g. ["services", "streams/logs-otel"]) */
  categories: string[];
  /** IDs of other pages referenced from this page's content */
  references: string[];
  /** Monotonically increasing version per entry */
  version: number;
  /** Tags for classification */
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  /** Present and true for soft-deleted tombstone documents */
  is_deleted?: boolean;
}

export type MemoryChangeType = 'create' | 'update' | 'delete' | 'rename';

/** A version history record for a memory entry. */
export interface MemoryVersionRecord {
  id: string;
  entry_id: string;
  version: number;
  name: string;
  title: string;
  content: string;
  tags: string[];
  categories: string[];
  change_type: MemoryChangeType;
  change_summary: string;
  created_at: string;
  created_by: string;
}

/** A node in the category tree hierarchy. */
export interface MemoryCategoryNode {
  /** Category name segment (e.g. "services" or "logs-otel") */
  name: string;
  /** Full category path (e.g. "streams/logs-otel") */
  category: string;
  /** Pages directly in this category */
  pages: Array<{ id: string; name: string; title: string }>;
  /** Sub-categories */
  children: MemoryCategoryNode[];
}

/** A memory search result with relevance score. */
export interface MemorySearchResult {
  id: string;
  name: string;
  title: string;
  snippet: string;
  score: number;
  updated_at: string;
  updated_by: string;
  tags: string[];
  categories: string[];
}
