/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Duration, DurationUnit } from '../models/duration';
import type { sloDefinitionSchema } from '../schema/zod/slo';
import type { sloWithDataResponseSchemaZod } from '../rest_specs/slo';

// Artifact-free base: assignable to both the definition schema (dashboards with
// `id`) and the stored schema (dashboards with `refId`) decoded types.
type BaseSLODefinition = Omit<z.output<typeof sloDefinitionSchema>, 'artifacts'>;
type SLOWithData = z.output<typeof sloWithDataResponseSchemaZod>;

export const FIXED_DATE_ISO = '2024-01-01T00:00:00.000Z';

export const apmTransactionDurationIndicator = {
  type: 'sli.apm.transactionDuration',
  params: {
    environment: 'production',
    service: 'api-service',
    transactionType: 'request',
    transactionName: 'GET /api',
    threshold: 500,
    index: 'metrics-apm*',
  },
} as const;

export const apmTransactionErrorRateIndicator = {
  type: 'sli.apm.transactionErrorRate',
  params: {
    environment: 'production',
    service: 'api-service',
    transactionType: 'request',
    transactionName: 'GET /api',
    index: 'metrics-apm*',
  },
} as const;

export const syntheticsAvailabilityIndicator = {
  type: 'sli.synthetics.availability',
  params: {
    monitorIds: [{ value: 'monitor-id', label: 'My monitor' }],
    index: 'synthetics-*',
  },
} as const;

export const kqlCustomIndicator = {
  type: 'sli.kql.custom',
  params: {
    index: 'my-index*',
    good: 'latency < 300',
    total: '',
    timestampField: 'log_timestamp',
    filter: 'labels.groupId: group-3',
  },
} as const;

export const metricCustomIndicator = {
  type: 'sli.metric.custom',
  params: {
    index: 'my-index*',
    good: {
      metrics: [
        { name: 'A', aggregation: 'sum', field: 'total' },
        { name: 'B', aggregation: 'doc_count' },
      ],
      equation: 'A - B',
    },
    total: {
      metrics: [{ name: 'A', aggregation: 'sum', field: 'total' }],
      equation: 'A',
    },
    timestampField: 'log_timestamp',
  },
} as const;

export const timesliceMetricIndicator = {
  type: 'sli.metric.timeslice',
  params: {
    index: 'test-*',
    timestampField: '@timestamp',
    metric: {
      metrics: [
        { name: 'A', aggregation: 'avg', field: 'latency' },
        { name: 'B', aggregation: 'percentile', field: 'latency', percentile: 95 },
        { name: 'C', aggregation: 'doc_count' },
      ],
      equation: 'A + B + C',
      threshold: 100,
      comparator: 'GTE',
    },
  },
} as const;

export const histogramIndicator = {
  type: 'sli.histogram.custom',
  params: {
    index: 'my-index*',
    timestampField: 'log_timestamp',
    good: {
      field: 'latency',
      aggregation: 'range',
      from: 0,
      to: 100,
    },
    total: {
      field: 'latency',
      aggregation: 'value_count',
    },
  },
} as const;

export const allWireIndicators = [
  apmTransactionDurationIndicator,
  apmTransactionErrorRateIndicator,
  syntheticsAvailabilityIndicator,
  kqlCustomIndicator,
  metricCustomIndicator,
  timesliceMetricIndicator,
  histogramIndicator,
] as const;

/** An SLO definition in its wire/stored form: durations and dates as strings. */
export const buildWireSLO = () => ({
  id: 'my-slo-id01',
  name: 'irrelevant name',
  description: 'irrelevant description',
  indicator: apmTransactionDurationIndicator,
  timeWindow: { duration: '30d', type: 'rolling' },
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
  settings: {
    syncDelay: '1m',
    frequency: '1m',
    preventInitialBackfill: false,
  },
  revision: 1,
  enabled: true,
  tags: ['critical'],
  createdAt: FIXED_DATE_ISO,
  updatedAt: FIXED_DATE_ISO,
  groupBy: '*',
  version: 2,
});

/** The same SLO definition in its decoded/domain form: Duration and Date instances. */
export const buildDomainSLO = (): BaseSLODefinition => ({
  id: 'my-slo-id01',
  name: 'irrelevant name',
  description: 'irrelevant description',
  indicator: apmTransactionDurationIndicator,
  timeWindow: { duration: new Duration(30, DurationUnit.Day), type: 'rolling' },
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
  settings: {
    syncDelay: new Duration(1, DurationUnit.Minute),
    frequency: new Duration(1, DurationUnit.Minute),
    preventInitialBackfill: false,
  },
  revision: 1,
  enabled: true,
  tags: ['critical'],
  createdAt: new Date(FIXED_DATE_ISO),
  updatedAt: new Date(FIXED_DATE_ISO),
  groupBy: '*',
  version: 2,
});

export const buildDomainSLOWithData = (): SLOWithData => ({
  ...buildDomainSLO(),
  summary: {
    status: 'HEALTHY',
    sliValue: 0.999,
    errorBudget: { initial: 0.01, consumed: 0.1, remaining: 0.9, isEstimated: false },
    fiveMinuteBurnRate: 0.1,
    oneHourBurnRate: 0.2,
    oneDayBurnRate: 0.3,
  },
  groupings: { 'host.name': 'my-host' },
  instanceId: '*',
});
