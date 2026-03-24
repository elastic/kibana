/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_TASK_SAVED_OBJECT, CASE_TASK_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
import type { Buckets } from '../types';

interface TaskStatusAggregation {
  byStatus: Buckets<string>;
}

export const getTasksTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['tasks']> => {
  const [taskRes, templateRes] = await Promise.all([
    savedObjectsClient.find<unknown, TaskStatusAggregation>({
      page: 0,
      perPage: 0,
      type: CASE_TASK_SAVED_OBJECT,
      namespaces: ['*'],
      aggs: {
        byStatus: {
          terms: {
            field: `${CASE_TASK_SAVED_OBJECT}.attributes.status`,
            size: 10,
          },
        },
      },
    }),
    savedObjectsClient.find<unknown, never>({
      page: 0,
      perPage: 0,
      type: CASE_TASK_TEMPLATE_SAVED_OBJECT,
      namespaces: ['*'],
    }),
  ]);

  const buckets = taskRes.aggregations?.byStatus?.buckets ?? [];
  const findCount = (key: string) =>
    buckets.find((b) => b.key === key)?.doc_count ?? 0;

  return {
    all: {
      total: taskRes.total,
      byStatus: {
        open: findCount('open'),
        inProgress: findCount('inProgress'),
        completed: findCount('completed'),
        cancelled: findCount('cancelled'),
      },
    },
    templates: {
      total: templateRes.total,
    },
  };
};
