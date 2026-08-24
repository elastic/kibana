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
    kiSummary: (aiIndexId: string) =>
      ['context_engine', 'ai_index', aiIndexId, 'ki_summary'] as const,
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
  improvements: {
    // The unparameterized prefix is what a mutation invalidates, so approving a suggestion
    // refreshes every page and status filter of the list, not just the one on screen.
    all: (aiIndexId: string) => ['context_engine', 'improvements', aiIndexId] as const,
    list: (aiIndexId: string, status: readonly string[] | undefined, from: number, size: number) =>
      ['context_engine', 'improvements', aiIndexId, status ?? 'open', from, size] as const,
  },
  feedbackLoop: {
    schedule: (aiIndexId: string) =>
      ['context_engine', 'feedback_loop', aiIndexId, 'schedule'] as const,
  },
};
