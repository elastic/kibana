/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '../..';
import { FETCH_BATCH_SIZE } from '../constants';
import type { TaskForClassification } from './classify_task';
import { buildUiamProvisioningFetchQuery } from './deferred_non_running_tasks_query';

export interface FetchFirstBatchOfTasksOptions {
  /**
   * Task `entityId`s that already have final UIAM provisioning status
   * (return value of {@link getExcludeTasksFilter}).
   */
  excludeTaskEntityIdsWithFinalStatus: string[];
  /** Defaults to {@link FETCH_BATCH_SIZE}. */
  perPage?: number;
}

/**
 * Fetches the first page of task docs for UIAM conversion
 * (mirrors `fetchFirstBatchOfRulesToConvert` in Alerting’s provisioning layer).
 */
export const fetchFirstBatchOfTasksToConvert = async (
  taskManager: TaskManagerStartContract,
  options: FetchFirstBatchOfTasksOptions
): Promise<{
  tasks: TaskForClassification[];
  hasMore: boolean;
}> => {
  const perPage = options.perPage ?? FETCH_BATCH_SIZE;
  const query = buildUiamProvisioningFetchQuery({
    excludeTaskEntityIdsWithFinalStatus: options.excludeTaskEntityIdsWithFinalStatus,
  });
  const { docs } = await taskManager.fetch({ query, size: perPage });
  const hasMore = docs.length >= perPage;
  return {
    tasks: docs as TaskForClassification[],
    hasMore,
  };
};
