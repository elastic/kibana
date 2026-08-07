/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const contextEngineQueryKeys = {
  aiIndex: {
    list: () => ['context_engine', 'ai_index', 'list'] as const,
    detail: (aiIndexId: string) => ['context_engine', 'ai_index', aiIndexId] as const,
  },
  memory: {
    all: () => ['context_engine', 'memory'] as const,
    status: () => ['context_engine', 'memory', 'status'] as const,
    categories: () => ['context_engine', 'memory', 'categories'] as const,
    entry: (entryId: string) => ['context_engine', 'memory', 'entry', entryId] as const,
    search: (query: string) => ['context_engine', 'memory', 'search', query] as const,
    // Versions nest under history so invalidating one page's history also drops
    // its cached versions.
    history: (entryId: string) => ['context_engine', 'memory', 'history', entryId] as const,
    version: (entryId: string, version: number) =>
      ['context_engine', 'memory', 'history', entryId, version] as const,
    recentChanges: () => ['context_engine', 'memory', 'recent_changes'] as const,
  },
  connectors: {
    list: () => ['context_engine', 'connectors', 'list'] as const,
    types: () => ['context_engine', 'connectors', 'types'] as const,
  },
};
