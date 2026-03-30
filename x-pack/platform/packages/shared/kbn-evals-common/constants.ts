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
export const EVALS_RUN_DATASET_EXAMPLES_URL =
  `${EVALS_INTERNAL_URL}/runs/{runId}/datasets/{datasetId}/examples` as const;
export const EVALS_EXAMPLE_SCORES_URL =
  `${EVALS_INTERNAL_URL}/examples/{exampleId}/scores` as const;
export const EVALS_TRACE_URL = `${EVALS_INTERNAL_URL}/traces/{traceId}` as const;
export const EVALS_DATASETS_URL = `${EVALS_INTERNAL_URL}/datasets` as const;
export const EVALS_DATASET_URL = `${EVALS_DATASETS_URL}/{datasetId}` as const;
export const EVALS_DATASET_EXAMPLES_URL = `${EVALS_DATASET_URL}/examples` as const;
export const EVALS_DATASET_EXAMPLE_URL = `${EVALS_DATASET_EXAMPLES_URL}/{exampleId}` as const;
export const EVALS_DATASET_UPSERT_URL = `${EVALS_DATASETS_URL}/_upsert` as const;

export const EVALUATIONS_INDEX_PATTERN = 'kibana-evaluations*' as const;
export const TRACES_INDEX_PATTERN = 'traces-*' as const;

export const API_VERSIONS = {
  internal: {
    v1: '1',
  },
} as const;

export const INTERNAL_API_ACCESS = 'internal' as const;

export const DATASET_UUID_NAMESPACE = 'f77b3ee3-7bc6-4bf8-9e43-d7fca9e69ae0' as const;

export const MAX_EXAMPLES_PER_DATASET = 10_000 as const;
export const MAX_SCORES_PER_QUERY = 10_000 as const;
