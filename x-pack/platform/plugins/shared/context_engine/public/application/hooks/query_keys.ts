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
    kiList: (aiIndexId: string, size: number, type: string | undefined) =>
      ['context_engine', 'ai_index', aiIndexId, 'ki_list', size, type ?? ''] as const,
    ki: (aiIndexId: string, index: string, kiId: string) =>
      ['context_engine', 'ai_index', aiIndexId, 'ki', index, kiId] as const,
  },
  connectors: {
    list: () => ['context_engine', 'connectors', 'list'] as const,
    types: () => ['context_engine', 'connectors', 'types'] as const,
  },
  signals: {
    groups: () => ['context_engine', 'signals', 'groups'] as const,
    byTag: (tag: string, from: number, size: number) =>
      ['context_engine', 'signals', 'by_tag', tag, from, size] as const,
  },
};
