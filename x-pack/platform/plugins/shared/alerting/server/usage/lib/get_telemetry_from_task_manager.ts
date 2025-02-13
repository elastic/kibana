/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, merge } from 'lodash';
import type {
  AggregationsTermsAggregateBase,
  AggregationsStringTermsBucketKeys,
  AggregationsBuckets,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { replaceDotSymbols } from './replace_dots_with_underscores';
import { NUM_ALERTING_RULE_TYPES } from '../alerting_usage_collector';
import { parseAndLogError } from './parse_and_log_error';

interface Opts {
  esClient: ElasticsearchClient;
  taskManagerIndex: string;
  logger: Logger;
}

interface GetFailedAndUnrecognizedTasksAggregationBucket extends AggregationsStringTermsBucketKeys {
  by_task_type: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
}

interface GetFailedAndUnrecognizedTasksResults {
  hasErrors: boolean;
  errorMessage?: string;
  countFailedAndUnrecognizedTasks: number;
  countFailedAndUnrecognizedTasksByStatus: Record<string, number>;
  countFailedAndUnrecognizedTasksByStatusByType: Record<string, Record<string, number>>;
}

export async function getFailedAndUnrecognizedTasksPerDay({
  esClient,
  taskManagerIndex,
  logger,
}: Opts): Promise<GetFailedAndUnrecognizedTasksResults> {
  try {
    const query = {
      index: taskManagerIndex,
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      term: {
                        'task.status': 'unrecognized',
                      },
                    },
                    {
                      term: {
                        'task.status': 'failed',
                      },
                    },
                  ],
                },
              },
              {
                wildcard: {
                  'task.taskType': {
                    value: 'alerting:*',
                  },
                },
              },
              {
                range: {
                  'task.runAt': {
                    gte: 'now-1d',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          by_status: {
            terms: {
              field: 'task.status',
              size: 10,
            },
            aggs: {
              by_task_type: {
                terms: {
                  field: 'task.taskType',
                  // Use number of alerting rule types because we're filtering by 'alerting:'
                  size: NUM_ALERTING_RULE_TYPES,
                },
              },
            },
          },
        },
      },
    };

    logger.debug(() => `query for getFailedAndUnrecognizedTasksPerDay - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);

    logger.debug(
      () => `results for getFailedAndUnrecognizedTasksPerDay query - ${JSON.stringify(results)}`
    );

    const aggregations = results.aggregations as {
      by_status: AggregationsTermsAggregateBase<GetFailedAndUnrecognizedTasksAggregationBucket>;
    };

    const totalFailedAndUnrecognizedTasks =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const aggregationsByStatus: AggregationsBuckets<GetFailedAndUnrecognizedTasksAggregationBucket> =
      aggregations.by_status.buckets as GetFailedAndUnrecognizedTasksAggregationBucket[];

    return {
      hasErrors: false,
      ...parseBucket(aggregationsByStatus),
      countFailedAndUnrecognizedTasks: totalFailedAndUnrecognizedTasks ?? 0,
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getFailedAndUnrecognizedTasksPerDay`, logger);

    return {
      hasErrors: true,
      errorMessage,
      countFailedAndUnrecognizedTasks: 0,
      countFailedAndUnrecognizedTasksByStatus: {},
      countFailedAndUnrecognizedTasksByStatusByType: {},
    };
  }
}

/**
 * Bucket format:
 * {
 *   "key": "idle",                   // task status
 *   "doc_count": 28,                 // number of tasks with this status
 *   "by_task_type": {
 *     "doc_count_error_upper_bound": 0,
 *     "sum_other_doc_count": 0,
 *     "buckets": [
 *       {
 *         "key": "alerting:.es-query", // breakdown of task type for status
 *         "doc_count": 1
 *       },
 *       {
 *         "key": "alerting:.index-threshold",
 *         "doc_count": 1
 *       }
 *     ]
 *   }
 * }
 */

export function parseBucket(
  buckets: GetFailedAndUnrecognizedTasksAggregationBucket[]
): Pick<
  GetFailedAndUnrecognizedTasksResults,
  'countFailedAndUnrecognizedTasksByStatus' | 'countFailedAndUnrecognizedTasksByStatusByType'
> {
  return (buckets ?? []).reduce(
    (summary, bucket) => {
      const status: string = bucket.key;
      const taskTypeBuckets = bucket?.by_task_type?.buckets as AggregationsStringTermsBucketKeys[];

      const byTaskType = (taskTypeBuckets ?? []).reduce<Record<string, number>>(
        (acc, taskTypeBucket: AggregationsStringTermsBucketKeys) => {
          const taskType: string = replaceDotSymbols(taskTypeBucket.key.replace('alerting:', ''));
          acc[taskType] = taskTypeBucket.doc_count ?? 0;
          return acc;
        },
        {}
      );
      return Object.assign(summary, {
        countFailedAndUnrecognizedTasksByStatus: {
          ...summary.countFailedAndUnrecognizedTasksByStatus,
          [status]: bucket?.doc_count ?? 0,
        },
        countFailedAndUnrecognizedTasksByStatusByType: merge(
          summary.countFailedAndUnrecognizedTasksByStatusByType,
          isEmpty(byTaskType) ? {} : { [status]: byTaskType }
        ),
      });
    },
    {
      countFailedAndUnrecognizedTasksByStatus: {},
      countFailedAndUnrecognizedTasksByStatusByType: {},
    }
  );
}
