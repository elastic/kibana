/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EVALS_INTERNAL_URL = '/internal/evals' as const;

export const EVALS_RUNS_URL = `${EVALS_INTERNAL_URL}/runs` as const;
export const EVALS_RUN_URL = `${EVALS_INTERNAL_URL}/runs/{runId}` as const;
export const EVALS_RUN_SCORES_URL = `${EVALS_INTERNAL_URL}/runs/{runId}/scores` as const;
export const EVALS_TRACE_URL = `${EVALS_INTERNAL_URL}/traces/{traceId}` as const;

export const EVALUATIONS_INDEX_PATTERN = 'kibana-evaluations*' as const;
export const TRACES_INDEX_PATTERN = 'traces-*' as const;

export const API_VERSIONS = {
  internal: {
    v1: '1',
  },
} as const;

export const INTERNAL_API_ACCESS = 'internal' as const;
