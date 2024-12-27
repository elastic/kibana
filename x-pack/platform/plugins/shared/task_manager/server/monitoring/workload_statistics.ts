/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, Observable, timer } from 'rxjs';
import { mergeMap, map, filter, switchMap, catchError } from 'rxjs';
import { Logger } from '@kbn/core/server';
import { JsonObject } from '@kbn/utility-types';
import { keyBy, mapValues } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AggregationResultOf } from '@kbn/es-types';
import { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { parseIntervalAsSecond, asInterval, parseIntervalAsMillisecond } from '../lib/intervals';
import { HealthStatus } from './monitoring_stats_stream';
import { TaskStore } from '../task_store';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskCost } from '../task';

interface StatusStat extends JsonObject {
  [status: string]: number;
}
interface TaskTypeStat extends JsonObject {
  [taskType: string]: {
    count: number;
    cost: number;
    status: StatusStat;
  };
}

interface RawWorkloadStat extends JsonObject {
  count: number;
  cost: number;
  task_types: TaskTypeStat;
  schedule: Array<[string, number]>;
  non_recurring: number;
  non_recurring_cost: number;
  overdue: number;
  overdue_cost: number;
  overdue_non_recurring: number;
  estimated_schedule_density: number[];
  capacity_requirements: CapacityRequirements;
}

export type WorkloadStat = RawWorkloadStat;
export type SummarizedWorkloadStat = RawWorkloadStat;
export interface CapacityRequirements extends JsonObject {
  per_minute: number;
  per_hour: number;
  per_day: number;
}

export interface WorkloadAggregation {
  aggs: {
    taskType: {
      terms: { field: string };
      aggs: {
        status: {
          terms: { field: string };
        };
      };
    };
    schedule: {
      terms: { field: string; size: number };
    };
    idleTasks: {
      filter: {
        term: { 'task.status': string };
      };
      aggs: {
        scheduleDensity: {
          range: {
            field: string;
            ranges: [{ from: string; to: string }];
          };
          aggs: {
            histogram: {
              date_histogram: {
                field: string;
                fixed_interval: string;
              };
              aggs: {
                interval: {
                  terms: { field: string };
                };
              };
            };
          };
        };
        overdue: {
          filter: {
            range: {
              'task.runAt': { lt: string };
            };
          };
        };
      };
    };
  };
}

// The type of a bucket in the scheduleDensity range aggregation
type ScheduleDensityResult = AggregationResultOf<
  WorkloadAggregation['aggs']['idleTasks']['aggs']['scheduleDensity'],
  {}
>['buckets'][0];
// @ts-expect-error cannot infer histogram
type ScheduledIntervals = ScheduleDensityResult['histogram']['buckets'][0];

// Set an upper bound just in case a customer sets a really high refresh rate
const MAX_SCHEDULE_DENSITY_BUCKETS = 50;

export interface CreateWorkloadAggregatorOpts {
  taskStore: TaskStore;
  elasticsearchAndSOAvailability$: Observable<boolean>;
  refreshInterval: number;
  pollInterval: number;
  logger: Logger;
  taskDefinitions: TaskTypeDictionary;
}

export function createWorkloadAggregator({
  taskStore,
  elasticsearchAndSOAvailability$,
  refreshInterval,
  pollInterval,
  logger,
  taskDefinitions,
}: CreateWorkloadAggregatorOpts): AggregatedStatProvider<WorkloadStat> {
  // calculate scheduleDensity going two refreshIntervals or 1 minute into into the future
  // (the longer of the two)
  const scheduleDensityBuckets = Math.min(
    Math.max(Math.round(60000 / pollInterval), Math.round((refreshInterval * 2) / pollInterval)),
    MAX_SCHEDULE_DENSITY_BUCKETS
  );

  const totalNumTaskDefinitions = taskDefinitions.getAllTypes().length;
  const taskTypeTermAggSize = Math.min(totalNumTaskDefinitions, 10000);

  return combineLatest([timer(0, refreshInterval), elasticsearchAndSOAvailability$]).pipe(
    filter(([, areElasticsearchAndSOAvailable]) => areElasticsearchAndSOAvailable),
    mergeMap(() =>
      taskStore.aggregate({
        aggs: {
          taskType: {
            terms: { size: taskTypeTermAggSize, field: 'task.taskType' },
            aggs: { status: { terms: { field: 'task.status' } } },
          },
          schedule: {
            terms: { field: 'task.schedule.interval', size: 100 },
          },
          nonRecurringTasks: {
            missing: { field: 'task.schedule.interval' },
            aggs: {
              taskType: { terms: { size: taskTypeTermAggSize, field: 'task.taskType' } },
            },
          },
          idleTasks: {
            filter: { term: { 'task.status': 'idle' } },
            aggs: {
              scheduleDensity: {
                // create a window of upcoming tasks
                range: {
                  field: 'task.runAt',
                  ranges: [
                    {
                      // @ts-expect-error type regression introduced by https://github.com/elastic/elasticsearch-specification/pull/2552
                      from: `now`,
                      // @ts-expect-error type regression introduced by https://github.com/elastic/elasticsearch-specification/pull/2552
                      to: `now+${asInterval(scheduleDensityBuckets * pollInterval)}`,
                    },
                  ],
                },
                aggs: {
                  // create histogram of scheduling in the window, with each bucket being a polling interval
                  histogram: {
                    date_histogram: {
                      field: 'task.runAt',
                      fixed_interval: asInterval(pollInterval),
                    },
                    // break down each bucket in the histogram by schedule
                    aggs: {
                      interval: {
                        terms: { field: 'task.schedule.interval' },
                      },
                    },
                  },
                },
              },
              overdue: {
                filter: { range: { 'task.runAt': { lt: 'now' } } },
                aggs: {
                  taskTypes: { terms: { size: taskTypeTermAggSize, field: 'task.taskType' } },
                  nonRecurring: { missing: { field: 'task.schedule.interval' } },
                },
              },
            },
          },
        },
      })
    ),
    map((result) => {
      const {
        aggregations,
        hits: { total },
      } = result;
      const count = typeof total === 'number' ? total : total?.value ?? 0;

      if (!hasAggregations(aggregations)) {
        throw new Error(`Invalid workload: ${JSON.stringify(result)}`);
      }

      const taskTypes = aggregations.taskType.buckets;
      const nonRecurring = aggregations.nonRecurringTasks.doc_count;
      const nonRecurringTaskTypes = aggregations.nonRecurringTasks.taskType.buckets;

      const {
        overdue: {
          doc_count: overdue,
          taskTypes: { buckets: taskTypesOverdue = [] } = {},
          nonRecurring: { doc_count: overdueNonRecurring },
        },
        scheduleDensity: { buckets: [scheduleDensity] = [] } = {},
      } = aggregations.idleTasks;

      const { schedules, cadence } = aggregations.schedule.buckets.reduce(
        (accm, schedule) => {
          const parsedSchedule = {
            interval: schedule.key as string,
            asSeconds: parseIntervalAsSecond(schedule.key as string),
            count: schedule.doc_count,
          };

          accm.schedules.push(parsedSchedule);
          if (parsedSchedule.asSeconds <= 60) {
            accm.cadence.perMinute +=
              parsedSchedule.count * Math.round(60 / parsedSchedule.asSeconds);
          } else if (parsedSchedule.asSeconds <= 3600) {
            accm.cadence.perHour +=
              parsedSchedule.count * Math.round(3600 / parsedSchedule.asSeconds);
          } else {
            accm.cadence.perDay +=
              parsedSchedule.count * Math.round((3600 * 24) / parsedSchedule.asSeconds);
          }
          return accm;
        },
        {
          cadence: { perMinute: 0, perHour: 0, perDay: 0 },
          schedules: [] as Array<{
            interval: string;
            asSeconds: number;
            count: number;
          }>,
        }
      );

      const totalNonRecurringCost = getTotalCost(nonRecurringTaskTypes, taskDefinitions);
      const totalOverdueCost = getTotalCost(taskTypesOverdue, taskDefinitions);

      let totalCost = 0;
      const taskTypeSummary = taskTypes.reduce((acc, bucket) => {
        const value = bucket as TaskTypeWithStatusBucket;
        const taskDef = taskDefinitions.get(value.key as string);
        if (taskDef) {
          const cost = value.doc_count * taskDef?.cost ?? TaskCost.Normal;

          totalCost += cost;
          return Object.assign(acc, {
            [value.key as string]: {
              count: value.doc_count,
              cost,
              status: mapValues(keyBy(value.status.buckets, 'key'), 'doc_count'),
            },
          });
        } else {
          // task type is not registered with dictionary, do not add to summary
          return acc;
        }
      }, {});

      const summary: WorkloadStat = {
        count,
        cost: totalCost,
        task_types: taskTypeSummary,
        non_recurring: nonRecurring,
        non_recurring_cost: totalNonRecurringCost,
        schedule: schedules
          .sort((scheduleLeft, scheduleRight) => scheduleLeft.asSeconds - scheduleRight.asSeconds)
          .map((schedule) => [schedule.interval, schedule.count]),
        overdue,
        overdue_cost: totalOverdueCost,
        overdue_non_recurring: overdueNonRecurring,
        estimated_schedule_density: padBuckets(
          scheduleDensityBuckets,
          pollInterval,
          scheduleDensity
        ),
        capacity_requirements: {
          per_minute: cadence.perMinute,
          per_hour: cadence.perHour,
          per_day: cadence.perDay,
        },
      };
      return {
        key: 'workload',
        value: summary,
      };
    }),
    catchError((ex: Error, caught) => {
      logger.error(`[WorkloadAggregator]: ${ex}`);
      // continue to pull values from the same observable but only on the next refreshInterval
      return timer(refreshInterval).pipe(switchMap(() => caught));
    })
  );
}

interface IntervalTaskCountTouple {
  nonRecurring?: number;
  recurring?: Array<[number, string]>;
  key: number;
}

export function padBuckets(
  scheduleDensityBuckets: number,
  pollInterval: number,
  scheduleDensity: ScheduleDensityResult
): number[] {
  // @ts-expect-error cannot infer histogram
  if (scheduleDensity.from && scheduleDensity.to && scheduleDensity.histogram?.buckets?.length) {
    // @ts-expect-error cannot infer histogram
    const { histogram, from, to } = scheduleDensity;
    const firstBucket = histogram.buckets[0].key;
    const lastBucket = histogram.buckets[histogram.buckets.length - 1].key;

    // detect when the first bucket is before the `from` so that we can take that into
    // account by begining the timeline earlier
    // This can happen when you have overdue tasks and Elasticsearch returns their bucket
    // as begining before the `from`
    const firstBucketStartsInThePast = firstBucket - from < 0;

    const bucketsToPadBeforeFirstBucket = firstBucketStartsInThePast
      ? []
      : calculateBucketsBetween(firstBucket, from, pollInterval);

    const bucketsToPadAfterLast = calculateBucketsBetween(
      lastBucket + pollInterval,
      firstBucketStartsInThePast ? to - pollInterval : to,
      pollInterval
    );

    return estimateRecurringTaskScheduling(
      [
        ...bucketsToPadBeforeFirstBucket,
        ...histogram.buckets.map(countByIntervalInBucket),
        ...bucketsToPadAfterLast,
      ],
      pollInterval
    );
  }
  return new Array(scheduleDensityBuckets).fill(0);
}

function countByIntervalInBucket(bucket: ScheduledIntervals): IntervalTaskCountTouple {
  if (bucket.doc_count === 0) {
    return { nonRecurring: 0, key: bucket.key };
  }
  const recurring: Array<[number, string]> = [];
  let nonRecurring = bucket.doc_count;
  for (const intervalBucket of bucket.interval.buckets) {
    recurring.push([intervalBucket.doc_count, intervalBucket.key as string]);
    nonRecurring -= intervalBucket.doc_count;
  }

  return { nonRecurring, recurring, key: bucket.key };
}

function calculateBucketsBetween(
  from: number,
  to: number,
  interval: number,
  bucketInterval: number = interval
): Array<{ key: number }> {
  const calcForwardInTime = from < to;

  // as task interval might not divide by the pollInterval (aka the bucket interval)
  // we have to adjust for the "drift" that occurs when estimating when the next
  // bucket the task might actually get scheduled in
  const actualInterval = Math.ceil(interval / bucketInterval) * bucketInterval;

  const buckets: Array<{ key: number }> = [];
  const toBound = calcForwardInTime ? to : -(to + actualInterval);
  let fromBound = calcForwardInTime ? from : -from;

  while (fromBound < toBound) {
    buckets.push({ key: fromBound });
    fromBound += actualInterval;
  }

  return calcForwardInTime
    ? buckets
    : buckets.reverse().map((bucket) => {
        bucket.key = Math.abs(bucket.key);
        return bucket;
      });
}

export function estimateRecurringTaskScheduling(
  scheduleDensity: IntervalTaskCountTouple[],
  pollInterval: number
) {
  const lastKey = scheduleDensity[scheduleDensity.length - 1].key;

  return scheduleDensity.map((bucket, currentBucketIndex) => {
    for (const [count, interval] of bucket.recurring ?? []) {
      for (const recurrance of calculateBucketsBetween(
        bucket.key,
        // `calculateBucketsBetween` uses the `to` as a non-inclusive upper bound
        // but lastKey is a bucket we wish to include
        lastKey + pollInterval,
        parseIntervalAsMillisecond(interval),
        pollInterval
      )) {
        const recurranceBucketIndex =
          currentBucketIndex + Math.ceil((recurrance.key - bucket.key) / pollInterval);

        if (recurranceBucketIndex < scheduleDensity.length) {
          scheduleDensity[recurranceBucketIndex].nonRecurring =
            count + (scheduleDensity[recurranceBucketIndex].nonRecurring ?? 0);
        }
      }
    }
    return bucket.nonRecurring ?? 0;
  });
}

export function summarizeWorkloadStat(workloadStats: WorkloadStat): {
  value: SummarizedWorkloadStat;
  status: HealthStatus;
} {
  return {
    value: workloadStats,
    status: HealthStatus.OK,
  };
}

function hasAggregations(
  aggregations?: Record<string, estypes.AggregationsAggregate>
): aggregations is WorkloadAggregationResponse {
  return !!(
    aggregations?.taskType &&
    aggregations?.schedule &&
    (aggregations?.idleTasks as IdleTasksAggregation)?.overdue &&
    (aggregations?.idleTasks as IdleTasksAggregation)?.scheduleDensity
  );
}
export interface WorkloadAggregationResponse {
  taskType: TaskTypeAggregation;
  schedule: ScheduleAggregation;
  idleTasks: IdleTasksAggregation;
  nonRecurringTasks: { doc_count: number; taskType: TaskTypeAggregation };
  [otherAggs: string]: estypes.AggregationsAggregate;
}

export type TaskTypeWithStatusBucket = TaskTypeBucket & {
  status: {
    buckets: Array<{
      doc_count: number;
      key: string | number;
    }>;
    doc_count_error_upper_bound?: number | undefined;
    sum_other_doc_count?: number | undefined;
  };
};

export interface TaskTypeBucket {
  doc_count: number;
  key: string | number;
}

// @ts-expect-error key doesn't accept a string
export interface TaskTypeAggregation extends estypes.AggregationsFiltersAggregate {
  buckets: Array<TaskTypeBucket | TaskTypeWithStatusBucket>;
  doc_count_error_upper_bound?: number | undefined;
  sum_other_doc_count?: number | undefined;
}

// @ts-expect-error key doesn't accept a string
export interface ScheduleAggregation extends estypes.AggregationsFiltersAggregate {
  buckets: Array<{ doc_count: number; key: string | number }>;
  doc_count_error_upper_bound?: number | undefined;
  sum_other_doc_count?: number | undefined;
}

export type ScheduleDensityHistogram = DateRangeBucket & {
  histogram: {
    buckets: Array<
      DateHistogramBucket & {
        interval: {
          buckets: Array<{
            doc_count: number;
            key: string | number;
          }>;
          doc_count_error_upper_bound?: number | undefined;
          sum_other_doc_count?: number | undefined;
        };
      }
    >;
  };
};
export interface IdleTasksAggregation extends estypes.AggregationsFiltersAggregate {
  doc_count: number;
  scheduleDensity: {
    buckets: ScheduleDensityHistogram[];
  };
  overdue: {
    doc_count: number;
    nonRecurring: { doc_count: number };
    taskTypes: TaskTypeAggregation;
  };
}

interface DateHistogramBucket {
  doc_count: number;
  key: number;
  key_as_string: string;
}
interface DateRangeBucket {
  key: string;
  to?: number;
  from?: number;
  to_as_string?: string;
  from_as_string?: string;
  doc_count: number;
}

function getTotalCost(taskTypeBuckets: TaskTypeBucket[], definitions: TaskTypeDictionary): number {
  let cost = 0;
  for (const bucket of taskTypeBuckets) {
    const taskDef = definitions.get(bucket.key as string);
    if (taskDef) {
      cost += bucket.doc_count * taskDef?.cost ?? TaskCost.Normal;
    } else {
      // task type is not registered with dictionary, do not add to cost
    }
  }
  return cost;
}
