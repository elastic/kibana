/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { UIAM_PROVISIONING_FETCH_RUN_AT_GT } from '../constants';

/**
 * Matched to Alerting's `EXCLUDE_FILTER_CLAUSE_BATCH_SIZE`
 * (`x-pack/.../alerting/server/provisioning/constants.ts`).
 */
const EXCLUDE_TASK_DOCUMENT_IDS_CHUNK_SIZE = 1024;

/**
 * Tasks eligible for UIAM API key background conversion:
 * - Not in `running` status, and
 * - Either `runAt` is after `UIAM_PROVISIONING_FETCH_RUN_AT_GT` (Elasticsearch `now+30s`, so an
 *   enabled task will not be claimed for execution imminently), or the task is **disabled** (Task
 *   Manager does not claim disabled tasks, so there is no race with execution regardless of
 *   `runAt`).
 *
 * Optional `excludeTaskEntityIdsWithFinalStatus`: Kibana task document `_id` values are `task:<id>`.
 * Excluding by `ids` prevents re-fetching tasks that already have a SKIPPED or COMPLETED
 * UIAM provisioning status document (see `getExcludeTasksFilter`).
 */
export const buildUiamProvisioningFetchQuery = (options?: {
  excludeTaskEntityIdsWithFinalStatus?: string[];
}): estypes.QueryDslQueryContainer => {
  const base: estypes.QueryDslQueryContainer = {
    bool: {
      must_not: [{ term: { 'task.status': 'running' } }],
      must: [
        {
          bool: {
            should: [
              { range: { 'task.runAt': { gt: UIAM_PROVISIONING_FETCH_RUN_AT_GT } } },
              { term: { 'task.enabled': false } },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  };
  const excludeIds = options?.excludeTaskEntityIdsWithFinalStatus;
  if (!excludeIds?.length) {
    return base;
  }
  const documentIds = excludeIds.map((id) => `task:${id}`);
  const should: estypes.QueryDslQueryContainer[] = [];
  for (let i = 0; i < documentIds.length; i += EXCLUDE_TASK_DOCUMENT_IDS_CHUNK_SIZE) {
    const chunk = documentIds.slice(i, i + EXCLUDE_TASK_DOCUMENT_IDS_CHUNK_SIZE);
    should.push({ ids: { values: chunk } });
  }
  return {
    bool: {
      must: [base],
      must_not: [
        {
          bool: {
            should,
            minimum_should_match: 1,
          },
        },
      ],
    },
  };
};
