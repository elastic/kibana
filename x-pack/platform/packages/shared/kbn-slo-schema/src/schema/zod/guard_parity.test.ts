/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runtime parity between io-ts `.is()` and the zod `is()` guard, for every schema
 * the slo plugin guards on: both must return the same boolean for the same input,
 * so swapping a guard cannot change behavior.
 *
 * Removed together with the io-ts schemas at the end of the zod migration.
 */

import type * as t from 'io-ts';
import type { z } from '@kbn/zod';
import { Duration, DurationUnit } from '../../models/duration';
import {
  allWireIndicators,
  apmTransactionDurationIndicator,
  apmTransactionErrorRateIndicator,
  histogramIndicator,
  kqlCustomIndicator,
  metricCustomIndicator,
  syntheticsAvailabilityIndicator,
  timesliceMetricIndicator,
} from '../../test_helpers/fixtures';
import {
  apmTransactionDurationIndicatorSchema as ioTsApmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema as ioTsApmTransactionErrorRateIndicatorSchema,
  histogramIndicatorSchema as ioTsHistogramIndicatorSchema,
  kqlCustomIndicatorSchema as ioTsKqlCustomIndicatorSchema,
  kqlQuerySchema as ioTsKqlQuerySchema,
  kqlWithFiltersSchema as ioTsKqlWithFiltersSchema,
  metricCustomBasicMetric as ioTsMetricCustomBasicMetric,
  metricCustomDocCountMetric as ioTsMetricCustomDocCountMetric,
  metricCustomIndicatorSchema as ioTsMetricCustomIndicatorSchema,
  querySchema as ioTsQuerySchema,
  syntheticsAvailabilityIndicatorSchema as ioTsSyntheticsAvailabilityIndicatorSchema,
  timesliceMetricBasicMetricWithField as ioTsTimesliceMetricBasicMetricWithField,
  timesliceMetricIndicatorSchema as ioTsTimesliceMetricIndicatorSchema,
  timesliceMetricPercentileMetric as ioTsTimesliceMetricPercentileMetric,
} from '../indicators';
import {
  occurrencesBudgetingMethodSchema as ioTsOccurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema as ioTsTimeslicesBudgetingMethodSchema,
} from '../slo';
import {
  calendarAlignedTimeWindowSchema as ioTsCalendarAlignedTimeWindowSchema,
  rollingTimeWindowSchema as ioTsRollingTimeWindowSchema,
  rollingTimeWindowTypeSchema as ioTsRollingTimeWindowTypeSchema,
} from '../time_window';
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
import { occurrencesBudgetingMethodSchema, timeslicesBudgetingMethodSchema } from './slo';
import {
  calendarAlignedTimeWindowSchema,
  rollingTimeWindowSchema,
  rollingTimeWindowTypeSchema,
} from './time_window';

type GuardInput = Parameters<typeof is>[1];
type GuardCase = [label: string, value: GuardInput, expected: boolean];
type GuardParityRow = [name: string, ioTsSchema: t.Any, zodSchema: z.ZodType, cases: GuardCase[]];

const budgetingCases = (matching: string): GuardCase[] => [
  ['timeslices', 'timeslices', matching === 'timeslices'],
  ['occurrences', 'occurrences', matching === 'occurrences'],
  ['other literal', 'other', false],
  ['undefined', undefined, false],
];

const rollingWindow = { duration: new Duration(30, DurationUnit.Day), type: 'rolling' };
const calendarAlignedWindow = {
  duration: new Duration(1, DurationUnit.Month),
  type: 'calendarAligned',
};

const timeWindowCases = (matching: 'rolling' | 'calendarAligned'): GuardCase[] => [
  ['rolling window', rollingWindow, matching === 'rolling'],
  ['calendar-aligned window', calendarAlignedWindow, matching === 'calendarAligned'],
  ['wire rolling window', { duration: '30d', type: 'rolling' }, false],
  ['wire calendar-aligned window', { duration: '1M', type: 'calendarAligned' }, false],
  ['window with extra key', { ...rollingWindow, extra: 'value' }, matching === 'rolling'],
  ['undefined', undefined, false],
];

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

const table: GuardParityRow[] = [
  [
    'timeslicesBudgetingMethodSchema',
    ioTsTimeslicesBudgetingMethodSchema,
    timeslicesBudgetingMethodSchema,
    budgetingCases('timeslices'),
  ],
  [
    'occurrencesBudgetingMethodSchema',
    ioTsOccurrencesBudgetingMethodSchema,
    occurrencesBudgetingMethodSchema,
    budgetingCases('occurrences'),
  ],
  [
    'rollingTimeWindowTypeSchema',
    ioTsRollingTimeWindowTypeSchema,
    rollingTimeWindowTypeSchema,
    [
      ['rolling', 'rolling', true],
      ['calendarAligned', 'calendarAligned', false],
      ['undefined', undefined, false],
    ],
  ],
  [
    'rollingTimeWindowSchema',
    ioTsRollingTimeWindowSchema,
    rollingTimeWindowSchema,
    timeWindowCases('rolling'),
  ],
  [
    'calendarAlignedTimeWindowSchema',
    ioTsCalendarAlignedTimeWindowSchema,
    calendarAlignedTimeWindowSchema,
    timeWindowCases('calendarAligned'),
  ],
  [
    'kqlQuerySchema',
    ioTsKqlQuerySchema,
    kqlQuerySchema,
    queryCases({ string: true, object: false }),
  ],
  [
    'kqlWithFiltersSchema',
    ioTsKqlWithFiltersSchema,
    kqlWithFiltersSchema,
    queryCases({ string: false, object: true }),
  ],
  ['querySchema', ioTsQuerySchema, querySchema, queryCases({ string: true, object: true })],
  [
    'apmTransactionDurationIndicatorSchema',
    ioTsApmTransactionDurationIndicatorSchema,
    apmTransactionDurationIndicatorSchema,
    indicatorCases(apmTransactionDurationIndicator),
  ],
  [
    'apmTransactionErrorRateIndicatorSchema',
    ioTsApmTransactionErrorRateIndicatorSchema,
    apmTransactionErrorRateIndicatorSchema,
    indicatorCases(apmTransactionErrorRateIndicator),
  ],
  [
    'syntheticsAvailabilityIndicatorSchema',
    ioTsSyntheticsAvailabilityIndicatorSchema,
    syntheticsAvailabilityIndicatorSchema,
    indicatorCases(syntheticsAvailabilityIndicator),
  ],
  [
    'kqlCustomIndicatorSchema',
    ioTsKqlCustomIndicatorSchema,
    kqlCustomIndicatorSchema,
    indicatorCases(kqlCustomIndicator),
  ],
  [
    'metricCustomIndicatorSchema',
    ioTsMetricCustomIndicatorSchema,
    metricCustomIndicatorSchema,
    indicatorCases(metricCustomIndicator),
  ],
  [
    'timesliceMetricIndicatorSchema',
    ioTsTimesliceMetricIndicatorSchema,
    timesliceMetricIndicatorSchema,
    indicatorCases(timesliceMetricIndicator),
  ],
  [
    'histogramIndicatorSchema',
    ioTsHistogramIndicatorSchema,
    histogramIndicatorSchema,
    indicatorCases(histogramIndicator),
  ],
  [
    'metricCustomDocCountMetric',
    ioTsMetricCustomDocCountMetric,
    metricCustomDocCountMetric,
    [
      ['doc_count metric', { name: 'A', aggregation: 'doc_count' }, true],
      ['sum metric', { name: 'A', aggregation: 'sum', field: 'total' }, false],
      ['doc_count metric missing name', { aggregation: 'doc_count' }, false],
    ],
  ],
  [
    'metricCustomBasicMetric',
    ioTsMetricCustomBasicMetric,
    metricCustomBasicMetric,
    [
      ['sum metric', { name: 'A', aggregation: 'sum', field: 'total' }, true],
      ['doc_count metric', { name: 'A', aggregation: 'doc_count' }, false],
      ['sum metric missing field', { name: 'A', aggregation: 'sum' }, false],
    ],
  ],
  [
    'timesliceMetricBasicMetricWithField',
    ioTsTimesliceMetricBasicMetricWithField,
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
    ioTsTimesliceMetricPercentileMetric,
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
];

describe.each(table)('%s guard parity', (_name, ioTsSchema, zodSchema, cases) => {
  it.each(cases)('%s', (_label, value, expected) => {
    expect(ioTsSchema.is(value)).toBe(expected);
    expect(is(zodSchema, value)).toBe(expected);
  });
});
