/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_TASK_SAVED_OBJECT, CASE_TASK_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import type { Buckets, Cardinality, CollectTelemetryDataParams, TasksTelemetry } from '../types';
import { findValueInBuckets } from './utils';

const SO = CASE_TASK_SAVED_OBJECT;

interface TasksAggregationResult {
  byStatus?: Buckets<string>;
  casesWithTasks?: Cardinality;
  fromTaskList?: { doc_count: number };
}

/**
 * Snapshot of case tasks: how many exist per status, how many cases use them, how many came from
 * a task list, and how many task lists are defined. Aggregations only; no task content is read.
 */
export const getTasksTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<TasksTelemetry> => {
  try {
    const [tasks, taskLists] = await Promise.all([
      savedObjectsClient.find<unknown, TasksAggregationResult>({
        page: 0,
        perPage: 0,
        type: SO,
        namespaces: ['*'],
        aggs: {
          byStatus: { terms: { field: `${SO}.attributes.status`, size: 4 } },
          casesWithTasks: { cardinality: { field: `${SO}.attributes.case_id` } },
          fromTaskList: { filter: { exists: { field: `${SO}.attributes.template_id` } } },
        },
      }),
      savedObjectsClient.find<unknown, never>({
        page: 0,
        perPage: 0,
        type: CASE_TASK_TEMPLATE_SAVED_OBJECT,
        namespaces: ['*'],
      }),
    ]);

    const buckets = tasks.aggregations?.byStatus?.buckets ?? [];

    return {
      total: tasks.total,
      byStatus: {
        open: findValueInBuckets(buckets, 'open'),
        inProgress: findValueInBuckets(buckets, 'in_progress'),
        completed: findValueInBuckets(buckets, 'completed'),
        cancelled: findValueInBuckets(buckets, 'cancelled'),
      },
      casesWithTasks: tasks.aggregations?.casesWithTasks?.value ?? 0,
      fromTaskList: tasks.aggregations?.fromTaskList?.doc_count ?? 0,
      taskLists: taskLists.total,
    };
  } catch (error) {
    logger.error(`Cases tasks telemetry failed with error: ${error}`);
    throw error;
  }
};
