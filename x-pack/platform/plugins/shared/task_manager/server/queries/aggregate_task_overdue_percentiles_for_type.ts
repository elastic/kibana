/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  MappingRuntimeFields,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
} from './mark_available_tasks_as_claimed';

export function aggregateTaskOverduePercentilesForType(type: string): {
  aggs: Record<string, AggregationsAggregationContainer>;
  query: QueryDslQueryContainer;
  runtime_mappings: MappingRuntimeFields;
} {
  return {
    query: {
      bool: {
        must: [
          {
            term: {
              'task.scope': {
                value: type,
              },
            },
          },
          {
            bool: {
              should: [IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt],
            },
          },
        ],
      },
    },
    runtime_mappings: {
      overdueBy: {
        type: 'long',
        script: {
          source: `
            def runAt = doc['task.runAt'];
            if(!runAt.empty) {
              emit(new Date().getTime() - runAt.value.getMillis());
            } else {
              def retryAt = doc['task.retryAt'];
              if(!retryAt.empty) {
                emit(new Date().getTime() - retryAt.value.getMillis());
              } else {
                emit(0);
              }
            }
          `,
        },
      },
    },
    aggs: {
      overdueByPercentiles: {
        percentiles: {
          field: 'overdueBy',
          percents: [50, 99],
        },
      },
    },
  };
}
