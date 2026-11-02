/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
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

const timeseriesSchema = z.union([
  z.object({
    name: z.union([
      z.literal(ApmTimeseriesType.transactionThroughput),
      z.literal(ApmTimeseriesType.transactionFailureRate),
    ]),
    'transaction.type': z.string().optional(),
    'transaction.name': z.string().optional(),
  }),
  z.object({
    name: z.union([
      z.literal(ApmTimeseriesType.exitSpanThroughput),
      z.literal(ApmTimeseriesType.exitSpanFailureRate),
      z.literal(ApmTimeseriesType.exitSpanLatency),
    ]),
    'span.destination.service.resource': z.string().optional(),
  }),
  z.object({
    name: z.literal(ApmTimeseriesType.transactionLatency),
    function: z.union([
      z.literal(LatencyAggregationType.avg),
      z.literal(LatencyAggregationType.p95),
      z.literal(LatencyAggregationType.p99),
    ]),
    'transaction.type': z.string().optional(),
    'transaction.name': z.string().optional(),
  }),
  z.object({
    name: z.literal(ApmTimeseriesType.errorEventRate),
  }),
]);

export const getApmTimeseriesRt = z.object({
  stats: z.array(
    z.object({
      'service.name': z.string(),
      title: z.string(),
      timeseries: timeseriesSchema,
      filter: z.string().optional(),
      offset: z.string().optional(),
      'service.environment': z.string().optional(),
    })
  ),
  start: z.string(),
  end: z.string(),
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
  stat: z.infer<typeof getApmTimeseriesRt>['stats'][number];
  group: string;
  id: string;
  data: Array<{ x: number; y: number | null }>;
  value: number | null;
  start: number;
  end: number;
  unit: string;
  changes: TimeseriesChangePoint[];
}
