/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { ChangePointType } from '@kbn/es-types/src';
import { LatencyAggregationType } from './latency_aggregation_types';

export enum ApmTimeseriesType {
  transactionThroughput = 'transaction_throughput',
  transactionLatency = 'transaction_latency',
  transactionFailureRate = 'transaction_failure_rate',
  exitSpanThroughput = 'exit_span_throughput',
  exitSpanLatency = 'exit_span_latency',
  exitSpanFailureRate = 'exit_span_failure_rate',
  errorEventRate = 'error_event_rate',
}

export const getApmTimeseriesRt = t.type({
  stats: t.array(
    t.intersection([
      t.type({
        'service.name': t.string,
        title: t.string,
        timeseries: t.union([
          t.intersection([
            t.type({
              name: t.union([
                t.literal(ApmTimeseriesType.transactionThroughput),
                t.literal(ApmTimeseriesType.transactionFailureRate),
              ]),
            }),
            t.partial({
              'transaction.type': t.string,
              'transaction.name': t.string,
            }),
          ]),
          t.intersection([
            t.type({
              name: t.union([
                t.literal(ApmTimeseriesType.exitSpanThroughput),
                t.literal(ApmTimeseriesType.exitSpanFailureRate),
                t.literal(ApmTimeseriesType.exitSpanLatency),
              ]),
            }),
            t.partial({
              'span.destination.service.resource': t.string,
            }),
          ]),
          t.intersection([
            t.type({
              name: t.literal(ApmTimeseriesType.transactionLatency),
              function: t.union([
                t.literal(LatencyAggregationType.avg),
                t.literal(LatencyAggregationType.p95),
                t.literal(LatencyAggregationType.p99),
              ]),
            }),
            t.partial({
              'transaction.type': t.string,
              'transaction.name': t.string,
            }),
          ]),
          t.type({
            name: t.literal(ApmTimeseriesType.errorEventRate),
          }),
        ]),
      }),
      t.partial({
        filter: t.string,
        offset: t.string,
        'service.environment': t.string,
      }),
    ])
  ),
  start: t.string,
  end: t.string,
});

export interface TimeseriesChangePoint {
  change_point?: number | undefined;
  r_value?: number | undefined;
  trend?: string | undefined;
  p_value?: number;
  date: string | undefined;
  type: ChangePointType;
}

export interface ApmTimeseries {
  stat: t.TypeOf<typeof getApmTimeseriesRt>['stats'][number];
  group: string;
  id: string;
  data: Array<{ x: number; y: number | null }>;
  value: number | null;
  start: number;
  end: number;
  unit: string;
  changes: TimeseriesChangePoint[];
}
