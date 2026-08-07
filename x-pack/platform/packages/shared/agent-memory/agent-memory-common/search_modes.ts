/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MEMORY_SEARCH_MODES = ['keyword', 'semantic', 'hybrid'] as const;

export type MemorySearchMode = (typeof MEMORY_SEARCH_MODES)[number];

const DEFAULT_MEMORY_SEARCH_MODE: MemorySearchMode = 'hybrid';

export function resolveMemorySearchMode(searchMode?: MemorySearchMode): MemorySearchMode {
  return searchMode ?? DEFAULT_MEMORY_SEARCH_MODE;
}
