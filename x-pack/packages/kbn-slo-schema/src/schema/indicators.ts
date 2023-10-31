/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { allOrAnyString, dateRangeSchema } from './common';

const apmTransactionDurationIndicatorTypeSchema = t.literal('sli.apm.transactionDuration');
const apmTransactionDurationIndicatorSchema = t.type({
  type: apmTransactionDurationIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      environment: allOrAnyString,
      service: allOrAnyString,
      transactionType: allOrAnyString,
      transactionName: allOrAnyString,
      threshold: t.number,
      index: t.string,
    }),
    t.partial({
      filter: t.string,
    }),
  ]),
});

const apmTransactionErrorRateIndicatorTypeSchema = t.literal('sli.apm.transactionErrorRate');
const apmTransactionErrorRateIndicatorSchema = t.type({
  type: apmTransactionErrorRateIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      environment: allOrAnyString,
      service: allOrAnyString,
      transactionType: allOrAnyString,
      transactionName: allOrAnyString,
      index: t.string,
    }),
    t.partial({
      filter: t.string,
    }),
  ]),
});

const kqlCustomIndicatorTypeSchema = t.literal('sli.kql.custom');
const kqlCustomIndicatorSchema = t.type({
  type: kqlCustomIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      index: t.string,
      good: t.string,
      total: t.string,
      timestampField: t.string,
    }),
    t.partial({
      filter: t.string,
    }),
  ]),
});

const timesliceMetricComparatorMapping = {
  GT: '>',
  GTE: '>=',
  LT: '<',
  LTE: '<=',
};

const timesliceMetricComparator = t.keyof(timesliceMetricComparatorMapping);

const timesliceMetricBasicMetricWithField = t.intersection([
  t.type({
    name: t.string,
    aggregation: t.keyof({
      avg: true,
      max: true,
      min: true,
      sum: true,
      cardinality: true,
      last_value: true,
      std_deviation: true,
    }),
    field: t.string,
  }),
  t.partial({
    filter: t.string,
  }),
]);

const timesliceMetricDocCountMetric = t.intersection([
  t.type({
    name: t.string,
    aggregation: t.literal('doc_count'),
  }),
  t.partial({
    filter: t.string,
  }),
]);

const timesliceMetricPercentileMetric = t.intersection([
  t.type({
    name: t.string,
    aggregation: t.literal('percentile'),
    field: t.string,
    percentile: t.number,
  }),
  t.partial({
    filter: t.string,
  }),
]);

const timesliceMetricMetricDef = t.union([
  timesliceMetricBasicMetricWithField,
  timesliceMetricDocCountMetric,
  timesliceMetricPercentileMetric,
]);

const timesliceMetricDef = t.type({
  metrics: t.array(timesliceMetricMetricDef),
  equation: t.string,
  threshold: t.number,
  comparator: timesliceMetricComparator,
});
const timesliceMetricIndicatorTypeSchema = t.literal('sli.metric.timeslice');
const timesliceMetricIndicatorSchema = t.type({
  type: timesliceMetricIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      index: t.string,
      metric: timesliceMetricDef,
      timestampField: t.string,
    }),
    t.partial({
      filter: t.string,
    }),
  ]),
});

const metricCustomValidAggregations = t.keyof({
  sum: true,
});
const metricCustomMetricDef = t.type({
  metrics: t.array(
    t.intersection([
      t.type({
        name: t.string,
        aggregation: metricCustomValidAggregations,
        field: t.string,
      }),
      t.partial({
        filter: t.string,
      }),
    ])
  ),
  equation: t.string,
});
const metricCustomIndicatorTypeSchema = t.literal('sli.metric.custom');
const metricCustomIndicatorSchema = t.type({
  type: metricCustomIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      index: t.string,
      good: metricCustomMetricDef,
      total: metricCustomMetricDef,
      timestampField: t.string,
    }),
    t.partial({
      filter: t.string,
    }),
  ]),
});

const rangeHistogramMetricType = t.literal('range');
const rangeBasedHistogramMetricDef = t.intersection([
  t.type({
    field: t.string,
    aggregation: rangeHistogramMetricType,
    from: t.number,
    to: t.number,
  }),
  t.partial({
    filter: t.string,
  }),
]);

const valueCountHistogramMetricType = t.literal('value_count');
const valueCountBasedHistogramMetricDef = t.intersection([
  t.type({
    field: t.string,
    aggregation: valueCountHistogramMetricType,
  }),
  t.partial({
    filter: t.string,
  }),
]);

const histogramMetricDef = t.union([
  valueCountBasedHistogramMetricDef,
  rangeBasedHistogramMetricDef,
]);

const histogramIndicatorTypeSchema = t.literal('sli.histogram.custom');
const histogramIndicatorSchema = t.type({
  type: histogramIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      index: t.string,
      timestampField: t.string,
      good: histogramMetricDef,
      total: histogramMetricDef,
    }),
    t.partial({
      filter: t.string,
    }),
  ]),
});

const indicatorDataSchema = t.type({
  dateRange: dateRangeSchema,
  good: t.number,
  total: t.number,
});

const indicatorTypesSchema = t.union([
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  kqlCustomIndicatorTypeSchema,
  metricCustomIndicatorTypeSchema,
  timesliceMetricIndicatorTypeSchema,
  histogramIndicatorTypeSchema,
]);

// Validate that a string is a comma separated list of indicator types,
// e.g. sli.kql.custom,sli.apm.transactionDuration
// Transform to an array of indicator type
const indicatorTypesArraySchema = new t.Type<string[], string, unknown>(
  'indicatorTypesArray',
  (input: unknown): input is string[] =>
    Array.isArray(input) && input.every((i) => typeof i === 'string'),
  (input: unknown, context: t.Context) => {
    if (typeof input === 'string') {
      const values = input.split(',');
      if (values.every((value) => typeof value === 'string' && indicatorTypesSchema.is(value))) {
        return t.success(values);
      }
    }
    return t.failure(input, context);
  },
  (values: string[]): string => values.join(',')
);

const indicatorSchema = t.union([
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
  timesliceMetricIndicatorSchema,
  histogramIndicatorSchema,
]);

export {
  apmTransactionDurationIndicatorSchema,
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  kqlCustomIndicatorSchema,
  kqlCustomIndicatorTypeSchema,
  metricCustomIndicatorSchema,
  metricCustomIndicatorTypeSchema,
  timesliceMetricComparatorMapping,
  timesliceMetricIndicatorSchema,
  timesliceMetricIndicatorTypeSchema,
  timesliceMetricMetricDef,
  timesliceMetricBasicMetricWithField,
  timesliceMetricDocCountMetric,
  timesliceMetricPercentileMetric,
  histogramIndicatorTypeSchema,
  histogramIndicatorSchema,
  indicatorSchema,
  indicatorTypesArraySchema,
  indicatorTypesSchema,
  indicatorDataSchema,
};
