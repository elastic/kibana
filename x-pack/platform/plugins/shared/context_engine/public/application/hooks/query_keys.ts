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
  traceIndices: () => ['context_engine', 'trace_indices'] as const,
  patterns: {
    list: (aiIndexId: string) => ['context_engine', 'patterns', aiIndexId] as const,
    cases: (aiIndexId: string, patternKey: string) =>
      ['context_engine', 'patterns', 'cases', aiIndexId, patternKey] as const,
    improvements: (aiIndexId: string, patternKey: string) =>
      ['context_engine', 'patterns', 'improvements', aiIndexId, patternKey] as const,
  },
};
