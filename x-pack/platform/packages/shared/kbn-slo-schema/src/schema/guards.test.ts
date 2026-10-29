/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * zod `is()` behavior for every schema the slo plugin guards on.
 */

import type { z } from '@kbn/zod';
import { Duration, DurationUnit } from '../models/duration';
import {
  allWireIndicators,
  apmTransactionDurationIndicator,
  apmTransactionErrorRateIndicator,
  histogramIndicator,
  kqlCustomIndicator,
  metricCustomIndicator,
  syntheticsAvailabilityIndicator,
  timesliceMetricIndicator,
} from '../test_helpers/fixtures';
import { is } from './guards';
import {
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  histogramIndicatorSchema,
  kqlCustomIndicatorSchema,
  kqlQuerySchema,
  kqlWithFiltersSchema,
  metricCustomBasicMetric,
  metricCustomDocCountMetric,
  metricCustomIndicatorSchema,
  querySchema,
  syntheticsAvailabilityIndicatorSchema,
  timesliceMetricBasicMetricWithField,
  timesliceMetricIndicatorSchema,
  timesliceMetricPercentileMetric,
} from './indicators';
import { rollingTimeWindowSchema } from './time_window';

type GuardInput = Parameters<typeof is>[1];
type GuardCase = [label: string, value: GuardInput, expected: boolean];
type GuardRow = [name: string, schema: z.ZodType, cases: GuardCase[]];

const queryCases = ({ string, object }: { string: boolean; object: boolean }): GuardCase[] => [
  ['empty string', '', string],
  ['kql string', 'a:b', string],
  ['kql with empty filters', { kqlQuery: 'a:b', filters: [] }, object],
  [
    'kql with a filter',
    { kqlQuery: 'a:b', filters: [{ meta: {}, query: { match_all: {} } }] },
    object,
  ],
  ['kql missing filters', { kqlQuery: 'a:b' }, false],
  ['kql with extra key', { kqlQuery: 'a:b', filters: [], extra: 'value' }, object],
  ['undefined', undefined, false],
];

const indicatorCases = (fixture: (typeof allWireIndicators)[number]): GuardCase[] => [
  ...allWireIndicators.map(
    (indicator): GuardCase => [indicator.type, indicator, indicator === fixture]
  ),
  [
    `${fixture.type} with extra param key`,
    { ...fixture, params: { ...fixture.params, extra: 'value' } },
    true,
  ],
  [`${fixture.type} without params`, { type: fixture.type }, false],
];

const table: GuardRow[] = [
  ['kqlQuerySchema', kqlQuerySchema, queryCases({ string: true, object: false })],
  ['kqlWithFiltersSchema', kqlWithFiltersSchema, queryCases({ string: false, object: true })],
  ['querySchema', querySchema, queryCases({ string: true, object: true })],
  [
    'apmTransactionDurationIndicatorSchema',
    apmTransactionDurationIndicatorSchema,
    indicatorCases(apmTransactionDurationIndicator),
  ],
  [
    'apmTransactionErrorRateIndicatorSchema',
    apmTransactionErrorRateIndicatorSchema,
    indicatorCases(apmTransactionErrorRateIndicator),
  ],
  [
    'syntheticsAvailabilityIndicatorSchema',
    syntheticsAvailabilityIndicatorSchema,
    indicatorCases(syntheticsAvailabilityIndicator),
  ],
  ['kqlCustomIndicatorSchema', kqlCustomIndicatorSchema, indicatorCases(kqlCustomIndicator)],
  [
    'metricCustomIndicatorSchema',
    metricCustomIndicatorSchema,
    indicatorCases(metricCustomIndicator),
  ],
  [
    'timesliceMetricIndicatorSchema',
    timesliceMetricIndicatorSchema,
    indicatorCases(timesliceMetricIndicator),
  ],
  ['histogramIndicatorSchema', histogramIndicatorSchema, indicatorCases(histogramIndicator)],
  [
    'metricCustomDocCountMetric',
    metricCustomDocCountMetric,
    [
      ['doc_count metric', { name: 'A', aggregation: 'doc_count' }, true],
      ['sum metric', { name: 'A', aggregation: 'sum', field: 'total' }, false],
      ['doc_count metric missing name', { aggregation: 'doc_count' }, false],
    ],
  ],
  [
    'metricCustomBasicMetric',
    metricCustomBasicMetric,
    [
      ['sum metric', { name: 'A', aggregation: 'sum', field: 'total' }, true],
      ['doc_count metric', { name: 'A', aggregation: 'doc_count' }, false],
      ['sum metric missing field', { name: 'A', aggregation: 'sum' }, false],
    ],
  ],
  [
    'timesliceMetricBasicMetricWithField',
    timesliceMetricBasicMetricWithField,
    [
      ['avg metric', { name: 'A', aggregation: 'avg', field: 'latency' }, true],
      [
        'percentile metric',
        { name: 'A', aggregation: 'percentile', field: 'latency', percentile: 95 },
        false,
      ],
      ['avg metric missing field', { name: 'A', aggregation: 'avg' }, false],
    ],
  ],
  [
    'timesliceMetricPercentileMetric',
    timesliceMetricPercentileMetric,
    [
      [
        'percentile metric',
        { name: 'A', aggregation: 'percentile', field: 'latency', percentile: 95 },
        true,
      ],
      ['avg metric', { name: 'A', aggregation: 'avg', field: 'latency' }, false],
      [
        'percentile metric missing field',
        { name: 'A', aggregation: 'percentile', percentile: 95 },
        false,
      ],
    ],
  ],
  // Codec caveat: is() re-checks the encoded value against the input-side bounds,
  // so a Duration that formats to '10000000000000000d' exceeds the 16-character
  // wire bound and is rejected even though it is a valid Duration instance.
  [
    'rollingTimeWindowSchema',
    rollingTimeWindowSchema,
    [
      ['rolling window', { duration: new Duration(30, DurationUnit.Day), type: 'rolling' }, true],
      [
        'rolling window with a duration over the wire bound',
        { duration: new Duration(9999999999999999, DurationUnit.Day), type: 'rolling' },
        false,
      ],
    ],
  ],
];

describe.each(table)('%s guard', (_name, schema, cases) => {
  it.each(cases)('%s', (_label, value, expected) => {
    expect(is(schema, value)).toBe(expected);
  });
});
