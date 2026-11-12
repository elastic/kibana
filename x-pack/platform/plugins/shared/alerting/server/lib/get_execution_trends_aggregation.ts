/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { AggregateEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { IExecutionTrendsResult } from '../../common';
import { EMPTY_EXECUTION_TRENDS_RESULT } from '../../common';
import {
  buildDslFilterQuery,
  getProviderAndActionFilter,
  type IExecutionLogAggOptions,
} from './get_execution_log_aggregation';

const RULE_ID_FIELD = 'rule.id';
const RULE_NAME_FIELD = 'rule.name';
const ALERTING_OUTCOME_FIELD = 'kibana.alerting.outcome';
const OUTCOME_FIELD = 'event.outcome';
const DURATION_FIELD = 'event.duration';

const Millis2Nanos = 1000 * 1000;
const TARGET_BUCKET_COUNT = 50;
const DEFAULT_TOP_RULES_SIZE = 10;

const INTERVALS: ReadonlyArray<{ interval: string; ms: number }> = [
  { interval: '1m', ms: 60_000 },
  { interval: '5m', ms: 5 * 60_000 },
  { interval: '10m', ms: 10 * 60_000 },
  { interval: '30m', ms: 30 * 60_000 },
  { interval: '1h', ms: 60 * 60_000 },
  { interval: '3h', ms: 3 * 60 * 60_000 },
  { interval: '12h', ms: 12 * 60 * 60_000 },
  { interval: '1d', ms: 24 * 60 * 60_000 },
  { interval: '7d', ms: 7 * 24 * 60 * 60_000 },
];

export interface IExecutionTrendsAggOptions {
  start: Date;
  end: Date;
  filter?: IExecutionLogAggOptions['filter'];
  topRulesSize?: number;
}

/** Picks the smallest fixed interval that keeps the histogram at or under ~50 buckets. */
export const getExecutionTrendsInterval = (start: Date, end: Date): string => {
  const rangeMs = Math.max(end.getTime() - start.getTime(), 0);
  const match = INTERVALS.find(({ ms }) => rangeMs / ms <= TARGET_BUCKET_COUNT);
  return (match ?? INTERVALS[INTERVALS.length - 1]).interval;
};

const failureFilter = (): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      { term: { [ALERTING_OUTCOME_FIELD]: 'failure' } },
      { term: { [OUTCOME_FIELD]: 'failure' } },
    ],
    minimum_should_match: 1,
  },
});

const ruleNameAgg = () => ({
  ruleName: {
    terms: {
      field: RULE_NAME_FIELD,
      size: 1,
    },
  },
});

export interface IExecutionTrendsAggregation {
  interval: string;
  aggs: Record<string, estypes.AggregationsAggregationContainer>;
}

export const getExecutionTrendsAggregation = ({
  start,
  end,
  filter,
  topRulesSize = DEFAULT_TOP_RULES_SIZE,
}: IExecutionTrendsAggOptions): IExecutionTrendsAggregation => {
  const dslFilterQuery = buildDslFilterQuery(filter);
  const interval = getExecutionTrendsInterval(start, end);

  return {
    interval,
    aggs: {
      ruleExecution: {
        filter: {
          bool: {
            ...(dslFilterQuery ? { filter: dslFilterQuery } : {}),
            must: [getProviderAndActionFilter('alerting', 'execute')],
          },
        },
        aggs: {
          byTime: {
            date_histogram: {
              field: TIMESTAMP,
              fixed_interval: interval,
              min_doc_count: 0,
              extended_bounds: {
                min: start.toISOString(),
                max: end.toISOString(),
              },
            },
            aggs: {
              outcomes: {
                multi_terms: {
                  size: 10,
                  terms: [{ field: ALERTING_OUTCOME_FIELD, missing: '' }, { field: OUTCOME_FIELD }],
                },
              },
              avgDuration: {
                avg: {
                  field: DURATION_FIELD,
                },
              },
            },
          },
          topFailingRules: {
            filter: failureFilter(),
            aggs: {
              byRule: {
                terms: {
                  field: RULE_ID_FIELD,
                  size: topRulesSize,
                },
                aggs: {
                  ...ruleNameAgg(),
                  lastFailure: {
                    max: {
                      field: TIMESTAMP,
                    },
                  },
                },
              },
            },
          },
          slowestRules: {
            terms: {
              field: RULE_ID_FIELD,
              size: topRulesSize,
              order: { avgDuration: 'desc' as const },
            },
            aggs: {
              ...ruleNameAgg(),
              avgDuration: {
                avg: {
                  field: DURATION_FIELD,
                },
              },
            },
          },
        },
      },
    },
  };
};

interface IOutcomeBucket {
  key: [string, string];
  doc_count: number;
}

interface ITimeBucket {
  key: number;
  key_as_string: string;
  doc_count: number;
  outcomes: { buckets: IOutcomeBucket[] };
  avgDuration: estypes.AggregationsAvgAggregate;
}

interface IRuleBucket {
  key: string;
  doc_count: number;
  ruleName: { buckets: Array<{ key: string; doc_count: number }> };
  lastFailure?: estypes.AggregationsMaxAggregate;
  avgDuration?: estypes.AggregationsAvgAggregate;
}

interface IExecutionTrendsAggResult extends estypes.AggregationsAggregateBase {
  byTime: { buckets: ITimeBucket[] };
  topFailingRules: { byRule: { buckets: IRuleBucket[] } };
  slowestRules: { buckets: IRuleBucket[] };
}

const nanosToMillis = (value: number | null | undefined): number =>
  value ? Math.round(value / Millis2Nanos) : 0;

const getRuleName = (bucket: IRuleBucket): string => bucket.ruleName?.buckets?.[0]?.key ?? '';

const resolveOutcome = ([alertingOutcome, eventOutcome]: [string, string]): string =>
  alertingOutcome || eventOutcome;

export function formatExecutionTrendsResult(
  interval: string,
  results: AggregateEventsBySavedObjectResult
): IExecutionTrendsResult {
  const { aggregations } = results;

  if (!aggregations || !aggregations.ruleExecution) {
    return { ...EMPTY_EXECUTION_TRENDS_RESULT, interval };
  }

  const aggs = aggregations.ruleExecution as IExecutionTrendsAggResult;

  const buckets = aggs.byTime.buckets.map((bucket) => {
    const counts = { success: 0, failure: 0, warning: 0, unknown: 0 };
    for (const outcomeBucket of bucket.outcomes.buckets) {
      const outcome = resolveOutcome(outcomeBucket.key);
      if (outcome === 'success' || outcome === 'failure' || outcome === 'warning') {
        counts[outcome] += outcomeBucket.doc_count;
      } else {
        counts.unknown += outcomeBucket.doc_count;
      }
    }
    return {
      timestamp: bucket.key_as_string,
      total: bucket.doc_count,
      ...counts,
      avgDurationMs: nanosToMillis(bucket.avgDuration?.value),
    };
  });

  const topFailingRules = aggs.topFailingRules.byRule.buckets.map((bucket) => ({
    id: bucket.key,
    name: getRuleName(bucket),
    failures: bucket.doc_count,
    lastFailure: bucket.lastFailure?.value_as_string ?? null,
  }));

  const slowestRules = aggs.slowestRules.buckets.map((bucket) => ({
    id: bucket.key,
    name: getRuleName(bucket),
    executions: bucket.doc_count,
    avgDurationMs: nanosToMillis(bucket.avgDuration?.value),
  }));

  return { interval, buckets, topFailingRules, slowestRules };
}
