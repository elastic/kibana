/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { MOCK_ROLLUP_INDEX_NAME, ROLLUP_INDEX_NAME } from './constants';

/**
 * Create the mock rollup index whose `_meta._rollup` mapping makes ES treat the cluster as having
 * rollup usage, which unhides the deprecated rollup UI and allows creating jobs. The job config it
 * declares matches the payload the API specs create, so the rollup capabilities it contributes are
 * the ones those specs expect.
 */
export const createMockRollupIndex = async (
  esClient: EsClient,
  index: string = MOCK_ROLLUP_INDEX_NAME,
  rollupIndex: string = ROLLUP_INDEX_NAME
) => {
  await esClient.indices.create({
    index,
    mappings: {
      _meta: {
        _rollup: {
          logs_job: {
            id: 'mockRollupJob',
            index_pattern: index,
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
        },
        'rollup-version': '',
      },
    },
  });
};

/**
 * Stop and delete the rollup jobs whose id starts with `idPrefix`. Rollup jobs are cluster-global
 * and the cluster may be shared, so cleanup must only touch jobs owned by the calling suite.
 */
export const deleteRollupJobsMatching = async (esClient: EsClient, idPrefix: string) => {
  const { jobs = [] } = await esClient.rollup.getJobs({ id: '_all' });
  for (const job of jobs) {
    const id = job.config?.id;
    if (!id || !id.startsWith(idPrefix)) continue;
    try {
      await esClient.rollup.stopJob({ id, wait_for_completion: true });
    } catch {
      // Not running or already gone — safe to skip.
    }
    try {
      await esClient.rollup.deleteJob({ id });
    } catch {
      // Already deleted — safe to skip.
    }
  }
};

/**
 * Stop and delete every rollup job in the cluster. Kept only for the pre-existing UI suite;
 * API specs must use `deleteRollupJobsMatching` so they never touch jobs owned by other suites.
 */
export const deleteAllRollupJobs = (esClient: EsClient) => deleteRollupJobsMatching(esClient, '');

/**
 * ES blocks wildcard/`_all` deletes (`action.destructive_requires_name`), so resolve the patterns
 * to concrete index names (a read, which allows wildcards) and delete those.
 */
export const deleteIndicesMatching = async (esClient: EsClient, patterns: string[]) => {
  const resolved = await esClient.indices.get(
    { index: patterns, allow_no_indices: true, ignore_unavailable: true },
    { ignore: [404] }
  );
  const names = Object.keys(resolved ?? {});
  if (names.length > 0) {
    await esClient.indices.delete({ index: names }, { ignore: [404] });
  }
};
