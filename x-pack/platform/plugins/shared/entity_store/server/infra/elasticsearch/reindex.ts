/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient as EsClient } from '@kbn/core/server';
import type {
  IndexName,
  Names,
  OpType,
  ReindexRequest,
  QueryDslQueryContainer,
  ReindexResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { waitForTaskToComplete } from './wait_for_task';
import type { WaitForTaskOptions } from './wait_for_task';

export interface ReindexOptions {
  source: { index: Names; query?: QueryDslQueryContainer };
  dest: { index: IndexName; op_type?: OpType };
  signal?: AbortSignal;
  waitForTask?: Omit<WaitForTaskOptions, 'esClient' | 'taskId' | 'signal'>;
}

export interface ReindexResult {
  created: number;
  updated: number;
  versionConflicts: number;
  total: number;
  failures: NonNullable<ReindexResponse['failures']>;
}

const toReindexResult = (response: ReindexResponse): ReindexResult => ({
  created: response.created ?? 0,
  updated: response.updated ?? 0,
  versionConflicts: response.version_conflicts ?? 0,
  total: response.total ?? 0,
  failures: response.failures ?? [],
});

/**
 * Throws when a reindex completed with document-level failures or left documents
 * unaccounted for. Callers must not delete the source until this succeeds.
 *
 * `conflicts: 'proceed'` can leave `versionConflicts` (and `updated` for index
 * destinations) on retry into a partial destination, or when `op_type: 'create'`
 * skips docs already written concurrently into the destination — those are
 * accounted for, not treated as data loss.
 */
export const assertReindexSucceeded = (result: ReindexResult, context: string): void => {
  if (result.failures.length > 0) {
    throw new Error(
      `${context}: reindex completed with ${result.failures.length} document failure(s); refusing to delete source`
    );
  }

  const accounted = result.created + result.updated + result.versionConflicts;
  if (accounted !== result.total) {
    throw new Error(
      `${context}: reindex incomplete (created=${result.created}, updated=${result.updated}, versionConflicts=${result.versionConflicts}, total=${result.total}); refusing to delete source`
    );
  }
};

export const reindex = async (
  esClient: EsClient,
  options: ReindexOptions
): Promise<ReindexResult> => {
  const { source, dest, signal, waitForTask } = options;
  const body: ReindexRequest = {
    source: { index: source.index, query: source.query },
    dest: { index: dest.index, op_type: dest.op_type },
    wait_for_completion: waitForTask === undefined,
    refresh: true,
    conflicts: 'proceed',
  };

  if (waitForTask !== undefined) {
    const { task } = await esClient.reindex(body, { signal });
    if (task == null) {
      throw new Error('Reindex did not return a task id');
    }
    const response = await waitForTaskToComplete<ReindexResponse>({
      ...waitForTask,
      esClient,
      taskId: task,
      signal,
    });
    return toReindexResult(response);
  }

  const response = await esClient.reindex(body, { signal });
  return toReindexResult(response);
};
