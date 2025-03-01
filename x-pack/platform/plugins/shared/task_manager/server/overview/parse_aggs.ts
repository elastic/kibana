/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';

interface ClaimMetrics {
  key: number;
  count: number;
  maxDuration: number;
  avgDuration: number;
  maxLoad: number;
  avgLoad: number;
}
interface RunMetrics {
  key: number;
  count: number;
  maxDuration: number;
  avgDuration: number;
  maxScheduleDelay: number;
  avgScheduleDelay: number;
  maxEventLoop: number;
}

export interface NodeResult {
  serverUuid: string;
  claim?: {
    success: number;
    failure: number;
    total: number;
    metrics: ClaimMetrics[];
  };
  run?: {
    success: number;
    failure: number;
    total: number;
    by_task_type: Record<string, { success: number; failure: number; total: number }>;
    metrics: RunMetrics[];
  };
}

export const parseAggs = (
  claimAggs: Record<string, AggregationsAggregate>,
  runAggs: Record<string, AggregationsAggregate>
): NodeResult[] => {
  const results = [];

  // @ts-ignore
  const claimOverview = claimAggs.serverUuid.buckets ?? [];
  for (const bucket of claimOverview) {
    const outcomeBuckets = bucket.outcome.buckets ?? [];
    const success =
      outcomeBuckets.find((b: { key: string }) => b.key === 'success')?.doc_count ?? 0;
    const failure =
      outcomeBuckets.find((b: { key: string }) => b.key === 'failure')?.doc_count ?? 0;

    const metricsBuckets = bucket.metrics.buckets ?? [];
    // @ts-ignore
    const metrics = metricsBuckets.map((metric) => {
      return {
        key: metric.key,
        count: metric.doc_count,
        maxDuration: metric.maxDuration.value,
        avgDuration: metric.avgDuration.value,
        maxLoad: metric.maxLoad.value,
        avgLoad: metric.avgLoad.value,
      };
    });
    results.push({
      serverUuid: bucket.key,
      claim: {
        success,
        failure,
        total: success + failure,
        metrics,
      },
    });
  }

  // @ts-ignore
  const runOverview = runAggs.serverUuid.buckets ?? [];
  for (const bucket of runOverview) {
    const serverUuid = bucket.key;
    const outcomeBuckets = bucket.outcome.buckets ?? [];
    const success =
      outcomeBuckets.find((b: { key: string }) => b.key === 'success')?.doc_count ?? 0;
    const failure =
      outcomeBuckets.find((b: { key: string }) => b.key === 'failure')?.doc_count ?? 0;

    const types = bucket.type.buckets ?? [];
    // @ts-ignore
    const groupedByTaskType = types.reduce((acc, b) => {
      const taskType = b.key;
      const o = b.outcome.buckets ?? [];
      const s = o.find((bo: { key: string }) => bo.key === 'success')?.doc_count ?? 0;
      const f = o.find((bo: { key: string }) => bo.key === 'failure')?.doc_count ?? 0;
      return {
        ...acc,
        [taskType]: {
          success: s,
          failure: f,
          total: s + f,
        },
      };
    }, {});

    const metricsBuckets = bucket.metrics.buckets ?? [];
    // @ts-ignore
    const metrics = metricsBuckets.map((metric) => {
      return {
        key: metric.key,
        count: metric.doc_count,
        maxDuration: metric.maxDuration.value,
        avgDuration: metric.avgDuration.value,
        maxScheduleDelay: metric.maxScheduleDelay.value,
        avgScheduleDelay: metric.avgScheduleDelay.value,
        maxEventLoop: metric.maxEventLoop.value,
      };
    });

    const errorsBuckets = bucket.errors?.buckets ?? [];
    // @ts-ignore
    const errorMessages = errorsBuckets.map((errorsBucket) => {
      const message = errorsBucket.key;
      const taskTypes = errorsBucket.type.buckets ?? [];
      return {
        message,
        byTaskType: taskTypes.map((t: { key: string; doc_count: number }) => ({
          type: t.key,
          count: t.doc_count,
        })),
      };
    });

    const index: number = results.findIndex((result) => result.serverUuid === serverUuid);
    if (index > -1) {
      results[index] = {
        ...results[index],
        run: {
          success,
          failure,
          total: success + failure,
          by_task_type: groupedByTaskType,
          metrics,
          errors: errorMessages,
        },
      };
    } else {
      results.push({
        serverUuid,
        run: {
          success,
          failure,
          total: success + failure,
          by_task_type: groupedByTaskType,
          metrics,
          errors: errorMessages,
        },
      });
    }
  }

  return results;
};
