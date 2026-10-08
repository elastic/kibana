/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient } from '@kbn/scout';
import {
  createMockRollupIndex,
  deleteIndicesMatching,
  deleteRollupJobsMatching,
} from '../../common/fixtures/rollup_api';
import {
  API_BASE_PATH,
  INDEX_TO_ROLLUP_MAPPINGS,
  JOB_ID_PREFIX,
  MOCK_INDEX_PREFIX,
  SOURCE_INDEX_PREFIX,
  TARGET_INDEX_PREFIX,
} from './constants';

// Every job and index this suite creates gets a run-unique name.
const uniqueSuffix = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const uniqueJobId = (scope: string) => `${JOB_ID_PREFIX}-${scope}-${uniqueSuffix()}`;
export const uniqueTargetIndex = (scope: string) =>
  `${TARGET_INDEX_PREFIX}-${scope}-${uniqueSuffix()}`;
export const uniqueMockIndex = (scope: string) => `${MOCK_INDEX_PREFIX}-${scope}-${uniqueSuffix()}`;

/** Shape of a job as returned by `GET /api/rollup/jobs`, narrowed to what the specs assert on. */
export interface RollupJobSummary {
  config: { id: string; index_pattern: string; rollup_index: string };
  status: { job_state: string };
}

export interface RollupJobPayload {
  job: Record<string, unknown>;
}

export const createMockRollupUsage = async (esClient: EsClient, scope: string) => {
  const index = uniqueMockIndex(scope);
  await createMockRollupIndex(esClient, index, `${index}-target`);
  return index;
};

/**
 * Index one rolled-up-format document into a job's target index. ES only maps the rollup fields
 * once the job has written data, and the job under test never runs in test time (weekly cron plus
 * 1d delay), so specs that need a populated rollup index seed it directly, like the UI fixtures do.
 */
export const seedRollupTargetDoc = async (
  esClient: EsClient,
  targetIndex: string,
  jobId: string
) => {
  const timestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  await esClient.index({
    index: targetIndex,
    refresh: 'wait_for',
    document: {
      '_rollup.version': 2,
      '_rollup.id': jobId,
      'testCreatedField.date_histogram.timestamp': timestamp,
      'testTagField.terms.value': 'foo',
      'testTotalField.terms.value': 100,
      'testTotalField.histogram.value': 100,
      'testTotalField.avg.value': 100,
      'testTotalField.value_count.value': 1,
    },
  });
};

/** Create a source index with the mappings the rollup jobs under test group and aggregate on. */
export const createSourceIndex = async (esClient: EsClient, scope: string) => {
  const index = `${SOURCE_INDEX_PREFIX}-${scope}-${uniqueSuffix()}`;
  await esClient.indices.create({ index, mappings: INDEX_TO_ROLLUP_MAPPINGS });
  return index;
};

/**
 * The job payload every spec creates. `interval` is deprecated in favour of `fixed_interval`, but
 * it is what the rollup UI still sends, so the tests keep exercising it (ES coerces it, which the
 * aggregations assertion in `rollup_jobs_crud.spec.ts` relies on).
 */
export const getJobPayload = (
  indexPattern: string,
  id: string,
  rollupIndex: string
): RollupJobPayload => ({
  job: {
    id,
    index_pattern: indexPattern,
    rollup_index: rollupIndex,
    cron: '0 0 0 ? * 7',
    page_size: 1000,
    groups: {
      date_histogram: {
        interval: '24h',
        delay: '1d',
        time_zone: 'UTC',
        field: 'testCreatedField',
      },
      terms: { fields: ['testTotalField', 'testTagField'] },
      histogram: { interval: '7', fields: ['testTotalField'] },
    },
    metrics: [
      { field: 'testTotalField', metrics: ['avg', 'value_count'] },
      { field: 'testCreatedField', metrics: ['max', 'min'] },
    ],
  },
});

/** Thin wrappers around the rollup routes, so the specs read as arrange/act/assert. */
export const rollupApi = (apiClient: ApiClientFixture, headers: Record<string, string>) => {
  const request = { headers, responseType: 'json' } as const;

  return {
    getIndices: () => apiClient.get(`${API_BASE_PATH}/indices`, request),
    getIndexPatternValidity: (indexPattern: string) =>
      apiClient.get(`${API_BASE_PATH}/index_pattern_validity/${indexPattern}`, request),
    loadJobs: () => apiClient.get(`${API_BASE_PATH}/jobs`, request),
    createJob: (payload: RollupJobPayload) =>
      apiClient.put(`${API_BASE_PATH}/create`, { ...request, body: payload }),
    deleteJob: (jobIds: string[]) =>
      apiClient.post(`${API_BASE_PATH}/delete`, { ...request, body: { jobIds } }),
    startJob: (jobIds: string[]) =>
      apiClient.post(`${API_BASE_PATH}/start`, { ...request, body: { jobIds } }),
    // `waitForCompletion` makes the stop synchronous, so the job state can be read back right after.
    stopJob: (jobIds: string[]) =>
      apiClient.post(`${API_BASE_PATH}/stop?waitForCompletion=true`, {
        ...request,
        body: { jobIds },
      }),
    search: (body: Array<{ index: string; query: Record<string, unknown> }>) =>
      apiClient.post(`${API_BASE_PATH}/search`, { ...request, body }),
  };
};

export type RollupApi = ReturnType<typeof rollupApi>;

/** Find a job by id in a `GET /jobs` response body. */
export const findJob = (body: { jobs: RollupJobSummary[] }, id: string) =>
  body.jobs.find((job) => job.config.id === id);

/**
 * Delete only the rollup jobs and indices owned by this suite (identified by its name prefixes):
 * the cluster may be shared. Clears leftovers of interrupted runs; jobs go first, since they write
 * into the target indices.
 */
export const cleanupRollupState = async (esClient: EsClient) => {
  await deleteRollupJobsMatching(esClient, JOB_ID_PREFIX);
  await deleteIndicesMatching(esClient, [
    `${SOURCE_INDEX_PREFIX}*`,
    `${TARGET_INDEX_PREFIX}*`,
    `${MOCK_INDEX_PREFIX}*`,
  ]);
};
