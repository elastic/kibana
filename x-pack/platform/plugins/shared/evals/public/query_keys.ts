/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  datasets: {
    all: ['evals', 'datasets'] as const,
    list: (filters?: { page?: number; perPage?: number }) =>
      ['evals', 'datasets', 'list', filters] as const,
    detail: (datasetId: string) => ['evals', 'datasets', 'detail', datasetId] as const,
  },
  remotes: {
    all: ['evals', 'remotes'] as const,
    list: () => ['evals', 'remotes', 'list'] as const,
  },
  experiments: {
    all: ['evals', 'experiments'] as const,
    list: (filters?: {
      suiteId?: string;
      modelId?: string;
      branch?: string;
      buildId?: string;
      page?: number;
      perPage?: number;
    }) => ['evals', 'experiments', 'list', filters] as const,
    detail: (experimentId: string) => ['evals', 'experiments', 'detail', experimentId] as const,
    scores: (experimentId: string) => ['evals', 'experiments', 'scores', experimentId] as const,
    datasetExamples: (experimentId: string, datasetId: string) =>
      ['evals', 'experiments', 'datasets', 'examples', experimentId, datasetId] as const,
    compare: (experimentIdA: string, experimentIdB: string) =>
      ['evals', 'experiments', 'compare', experimentIdA, experimentIdB] as const,
  },
  examples: {
    all: ['evals', 'examples'] as const,
    scores: (exampleId: string) => ['evals', 'examples', 'scores', exampleId] as const,
  },
  traces: {
    all: ['evals', 'traces'] as const,
    detail: (traceId: string) => ['evals', 'traces', 'detail', traceId] as const,
  },
  tracing: {
    all: ['evals', 'tracing'] as const,
    projects: (filters?: {
      from?: string;
      to?: string;
      name?: string;
      page?: number;
      perPage?: number;
    }) => ['evals', 'tracing', 'projects', filters] as const,
    projectTraces: (
      projectName: string,
      filters?: {
        from?: string;
        to?: string;
        name?: string;
        sortField?: string;
        sortOrder?: string;
        page?: number;
        perPage?: number;
      }
    ) => ['evals', 'tracing', 'projects', projectName, 'traces', filters] as const,
  },
};
