/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  runs: {
    all: ['evals', 'runs'] as const,
    list: (filters?: {
      suiteId?: string;
      modelId?: string;
      branch?: string;
      page?: number;
      perPage?: number;
    }) => ['evals', 'runs', 'list', filters] as const,
    detail: (runId: string) => ['evals', 'runs', 'detail', runId] as const,
    scores: (runId: string) => ['evals', 'runs', 'scores', runId] as const,
  },
  traces: {
    all: ['evals', 'traces'] as const,
    detail: (traceId: string) => ['evals', 'traces', 'detail', traceId] as const,
  },
};
