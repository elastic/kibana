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
    datasetExamples: (runId: string, datasetId: string) =>
      ['evals', 'runs', 'datasets', 'examples', runId, datasetId] as const,
    compare: (runIdA: string, runIdB: string) =>
      ['evals', 'runs', 'compare', runIdA, runIdB] as const,
  },
  examples: {
    all: ['evals', 'examples'] as const,
    scores: (exampleId: string) => ['evals', 'examples', 'scores', exampleId] as const,
  },
  traces: {
    all: ['evals', 'traces'] as const,
    detail: (traceId: string) => ['evals', 'traces', 'detail', traceId] as const,
  },
  evaluators: {
    all: ['evals', 'evaluators'] as const,
    list: (filters?: { page?: number; perPage?: number; search?: string }) =>
      ['evals', 'evaluators', 'list', filters] as const,
    detail: (evaluatorId: string) => ['evals', 'evaluators', 'detail', evaluatorId] as const,
  },
  evaluation: {
    all: ['evals', 'evaluation'] as const,
    gates: () => ['evals', 'evaluation', 'gates'] as const,
  },
  monitoring: {
    all: ['evals', 'monitoring'] as const,
    metrics: (skillId: string, from: string, to: string) =>
      ['evals', 'monitoring', 'metrics', skillId, from, to] as const,
    alerts: (skillId: string) => ['evals', 'monitoring', 'alerts', skillId] as const,
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
  experiments: {
    all: ['evals', 'experiments'] as const,
    suites: () => ['evals', 'experiments', 'suites'] as const,
    run: (workflowExecutionId: string) =>
      ['evals', 'experiments', 'run', workflowExecutionId] as const,
    logs: (workflowExecutionId: string, options?: { page?: number; size?: number }) =>
      [
        ...(['evals', 'experiments', 'logs', workflowExecutionId] as const),
        ...(options ? ([options] as const) : []),
      ] as const,
  },
};
