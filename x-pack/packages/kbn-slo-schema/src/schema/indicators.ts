/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { allOrAnyString } from './common';

const kqlQuerySchema = t.string;

const filtersSchema = t.array(
  t.intersection([
    t.type({
      meta: t.partial({
        alias: t.union([t.string, t.null]),
        disabled: t.boolean,
        negate: t.boolean,
        // controlledBy is there to identify who owns the filter
        controlledBy: t.string,
        // allows grouping of filters
        group: t.string,
        // index and type are optional only because when you create a new filter, there are no defaults
        index: t.string,
        isMultiIndex: t.boolean,
        type: t.string,
        key: t.string,
        field: t.string,
        params: t.any,
        value: t.string,
      }),
      query: t.record(t.string, t.any),
    }),
    t.partial({
      $state: t.any,
    }),
  ])
);

const kqlWithFiltersSchema = t.type({
  kqlQuery: t.string,
  filters: filtersSchema,
});

const querySchema = t.union([kqlQuerySchema, kqlWithFiltersSchema]);

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
      filter: querySchema,
      dataViewId: t.string,
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
      filter: querySchema,
      dataViewId: t.string,
    }),
  ]),
});

const kqlCustomIndicatorTypeSchema = t.literal('sli.kql.custom');
const kqlCustomIndicatorSchema = t.type({
  type: kqlCustomIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      index: t.string,
      good: querySchema,
      total: querySchema,
      timestampField: t.string,
    }),
    t.partial({
      filter: querySchema,
      dataViewId: t.string,
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
    filter: querySchema,
  }),
]);

const timesliceMetricDocCountMetric = t.intersection([
  t.type({
    name: t.string,
    aggregation: t.literal('doc_count'),
  }),
  t.partial({
    filter: querySchema,
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
    filter: querySchema,
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
      filter: querySchema,
      dataViewId: t.string,
    }),
  ]),
});

const metricCustomDocCountMetric = t.intersection([
  t.type({
    name: t.string,
    aggregation: t.literal('doc_count'),
  }),
  t.partial({
    filter: querySchema,
  }),
]);

const metricCustomBasicMetric = t.intersection([
  t.type({
    name: t.string,
    aggregation: t.literal('sum'),
    field: t.string,
  }),
  t.partial({
    filter: querySchema,
  }),
]);

const metricCustomMetricDef = t.type({
  metrics: t.array(t.union([metricCustomBasicMetric, metricCustomDocCountMetric])),
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
      filter: querySchema,
      dataViewId: t.string,
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
    filter: querySchema,
  }),
]);

const valueCountHistogramMetricType = t.literal('value_count');
const valueCountBasedHistogramMetricDef = t.intersection([
  t.type({
    field: t.string,
    aggregation: valueCountHistogramMetricType,
  }),
  t.partial({
    filter: querySchema,
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
      filter: querySchema,
      dataViewId: t.string,
    }),
  ]),
});

const syntheticsParamSchema = t.type({
  value: allOrAnyString,
  label: allOrAnyString,
});
const syntheticsAvailabilityIndicatorTypeSchema = t.literal('sli.synthetics.availability');
const syntheticsAvailabilityIndicatorSchema = t.type({
  type: syntheticsAvailabilityIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      monitorIds: t.array(syntheticsParamSchema),
      index: t.string,
    }),
    t.partial({
      tags: t.array(syntheticsParamSchema),
      projects: t.array(syntheticsParamSchema),
      filter: querySchema,
      dataViewId: t.string,
    }),
  ]),
});

const indicatorTypesSchema = t.union([
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  syntheticsAvailabilityIndicatorTypeSchema,
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
  syntheticsAvailabilityIndicatorSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
  timesliceMetricIndicatorSchema,
  histogramIndicatorSchema,
]);

export {
  kqlQuerySchema,
  kqlWithFiltersSchema,
  querySchema,
  filtersSchema,
  apmTransactionDurationIndicatorSchema,
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  syntheticsAvailabilityIndicatorSchema,
  syntheticsAvailabilityIndicatorTypeSchema,
  kqlCustomIndicatorSchema,
  kqlCustomIndicatorTypeSchema,
  metricCustomIndicatorSchema,
  metricCustomIndicatorTypeSchema,
  metricCustomDocCountMetric,
  metricCustomBasicMetric,
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
};
