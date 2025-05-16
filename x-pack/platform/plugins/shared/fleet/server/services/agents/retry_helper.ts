/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import { BulkActionTaskType } from './bulk_action_types';

export const MAX_RETRY_COUNT = 20;

export interface RetryParams {
  pitId?: string;
  searchAfter?: SortResults;
  retryCount?: number;
  taskId?: string;
}

export function getRetryParams(taskType: string, retryParams: RetryParams): RetryParams {
  // update tags will retry with tags filter
  return taskType === BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY
    ? {
        ...retryParams,
        pitId: undefined,
        searchAfter: undefined,
      }
    : retryParams;
}
