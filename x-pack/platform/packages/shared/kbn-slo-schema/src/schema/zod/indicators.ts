/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { allOrAnyString } from './common';
import { MAX_ARRAY_LENGTH, MAX_KEYWORD_LENGTH, MAX_QUERY_LENGTH } from './limits';

const kqlQuerySchema = z
  .string()
  .max(MAX_QUERY_LENGTH)
  .describe('the KQL query to filter the documents with.');

const filterMetaSchema = z
  .object({
    alias: z.string().max(MAX_KEYWORD_LENGTH).nullable().optional(),
    disabled: z.boolean().optional(),
    negate: z.boolean().optional(),
    // controlledBy is there to identify who owns the filter
    controlledBy: z.string().max(MAX_KEYWORD_LENGTH).optional(),
    // allows grouping of filters
    group: z.string().max(MAX_KEYWORD_LENGTH).optional(),
    // index and type are optional only because when you create a new filter, there are no defaults
    index: z.string().max(MAX_KEYWORD_LENGTH).optional(),
    isMultiIndex: z.boolean().optional(),
    type: z.string().max(MAX_KEYWORD_LENGTH).optional(),
    key: z.string().max(MAX_KEYWORD_LENGTH).optional(),
    field: z.string().max(MAX_KEYWORD_LENGTH).optional(),
    params: z.any().optional(),
    value: z.string().max(MAX_QUERY_LENGTH).optional(),
  })
  .meta({ id: 'SLOFilterMeta', description: 'Defines properties for a filter' });

const filtersSchema = z
  .array(
    z
      .object({
        meta: filterMetaSchema,
        query: z.record(z.string(), z.any()),
        $state: z.any().optional(),
      })
      .meta({ id: 'SLOFilter', description: 'Defines properties for a filter' })
  )
  .max(MAX_ARRAY_LENGTH);

const kqlWithFiltersSchema = z
  .object({
    kqlQuery: kqlQuerySchema,
    filters: filtersSchema,
  })
  .meta({ id: 'SLOKqlWithFilters', description: 'Defines properties for a filter' });

const querySchema = z.union([kqlQuerySchema, kqlWithFiltersSchema]);

const indexSchema = z
  .string()
  .max(MAX_KEYWORD_LENGTH)
  .describe('The index or index pattern to use');

const dataViewIdSchema = z
  .string()
  .max(MAX_KEYWORD_LENGTH)
  .describe(
    'The kibana data view id to use, primarily used to include data view runtime mappings. ' +
      'Make sure to save SLO again if you add/update run time fields to the data view and if those fields are being used in slo queries.'
  );

const timestampFieldSchema = z
  .string()
  .max(MAX_KEYWORD_LENGTH)
  .describe('The timestamp field used in the source indice.');

const apmIndicatorBaseParams = z.object({
  environment: allOrAnyString.describe('The APM service environment or "*"'),
  service: allOrAnyString.describe('The APM service name'),
  transactionType: allOrAnyString.describe('The APM transaction type or "*"'),
  transactionName: allOrAnyString.describe('The APM transaction name or "*"'),
  index: z.string().max(MAX_KEYWORD_LENGTH).describe('The index used by APM metrics'),
  filter: querySchema.describe('KQL query used for filtering the data').optional(),
  dataViewId: dataViewIdSchema.optional(),
});

const apmTransactionDurationIndicatorTypeSchema = z.literal('sli.apm.transactionDuration');
const apmTransactionDurationIndicatorSchema = z
  .object({
    type: apmTransactionDurationIndicatorTypeSchema.describe('The type of indicator.'),
    params: apmIndicatorBaseParams
      .extend({
        threshold: z.number().describe('The latency threshold in milliseconds'),
      })
      .describe('An object containing the indicator parameters.'),
  })
  .meta({
    id: 'SLOIndicatorPropertiesApmLatency',
    description: 'Defines properties for the APM latency indicator type',
  });

const apmTransactionErrorRateIndicatorTypeSchema = z.literal('sli.apm.transactionErrorRate');
const apmTransactionErrorRateIndicatorSchema = z
  .object({
    type: apmTransactionErrorRateIndicatorTypeSchema.describe('The type of indicator.'),
    params: apmIndicatorBaseParams.describe('An object containing the indicator parameters.'),
  })
  .meta({
    id: 'SLOIndicatorPropertiesApmAvailability',
    description: 'Defines properties for the APM availability indicator type',
  });

const kqlCustomIndicatorTypeSchema = z.literal('sli.kql.custom');
const kqlCustomIndicatorSchema = z
  .object({
    type: kqlCustomIndicatorTypeSchema.describe('The type of indicator.'),
    params: z
      .object({
        index: indexSchema,
        good: querySchema.describe(
          'the KQL query used to define the good events, or an object defining the KQL query and filters.'
        ),
        total: querySchema.describe(
          'the KQL query used to define all events, or an object defining the KQL query and filters.'
        ),
        timestampField: timestampFieldSchema,
        filter: querySchema.describe('the KQL query to filter the documents with.').optional(),
        dataViewId: dataViewIdSchema.optional(),
      })
      .describe('An object containing the indicator parameters.'),
  })
  .meta({
    id: 'SLOIndicatorPropertiesCustomKql',
    description: 'Defines properties for a custom query indicator type',
  });

const timesliceMetricComparator = z
  .enum(['GT', 'GTE', 'LT', 'LTE'])
  .describe('The comparator to use to compare the equation to the threshold.');

const metricNameSchema = z
  .string()
  .max(MAX_KEYWORD_LENGTH)
  .describe('The name of the metric. Only valid options are A-Z');

const metricFilterSchema = querySchema.describe('The filter to apply to the metric.');

const metricFieldSchema = z.string().max(MAX_KEYWORD_LENGTH).describe('The field of the metric.');

const timesliceMetricBasicMetricWithField = z
  .object({
    name: metricNameSchema,
    aggregation: z
      .enum(['avg', 'max', 'min', 'sum', 'cardinality', 'last_value', 'std_deviation'])
      .describe('The aggregation type of the metric.'),
    field: metricFieldSchema,
    filter: metricFilterSchema.optional(),
  })
  .meta({ id: 'SLOTimesliceMetricBasicMetricWithField' });

const timesliceMetricDocCountMetric = z
  .object({
    name: metricNameSchema,
    aggregation: z
      .literal('doc_count')
      .describe('The aggregation type of the metric. Only valid option is "doc_count"'),
    filter: metricFilterSchema.optional(),
  })
  .meta({ id: 'SLOTimesliceMetricDocCountMetric' });

const timesliceMetricPercentileMetric = z
  .object({
    name: metricNameSchema,
    aggregation: z
      .literal('percentile')
      .describe('The aggregation type of the metric. Only valid option is "percentile"'),
    field: metricFieldSchema,
    percentile: z.number().describe('The percentile value.'),
    filter: metricFilterSchema.optional(),
  })
  .meta({ id: 'SLOTimesliceMetricPercentileMetric' });

const timesliceMetricMetricDef = z.union([
  timesliceMetricBasicMetricWithField,
  timesliceMetricDocCountMetric,
  timesliceMetricPercentileMetric,
]);

const timesliceMetricDef = z.object({
  metrics: z
    .array(timesliceMetricMetricDef)
    .max(MAX_ARRAY_LENGTH)
    .describe('List of metrics with their name, aggregation type, and field.'),
  equation: z.string().max(MAX_KEYWORD_LENGTH).describe('The equation to calculate the metric.'),
  threshold: z
    .number()
    .describe('The threshold used to determine if the metric is a good slice or not.'),
  comparator: timesliceMetricComparator,
});
const timesliceMetricIndicatorTypeSchema = z.literal('sli.metric.timeslice');
const timesliceMetricIndicatorSchema = z
  .object({
    type: timesliceMetricIndicatorTypeSchema.describe('The type of indicator.'),
    params: z
      .object({
        index: indexSchema,
        metric: timesliceMetricDef.describe(
          "An object defining the metrics, equation, and threshold to determine if it's a good slice or not"
        ),
        timestampField: timestampFieldSchema,
        filter: querySchema.describe('the KQL query to filter the documents with.').optional(),
        dataViewId: dataViewIdSchema.optional(),
      })
      .describe('An object containing the indicator parameters.'),
  })
  .meta({
    id: 'SLOIndicatorPropertiesTimesliceMetric',
    description: 'Defines properties for a timeslice metric indicator type',
  });

const metricCustomDocCountMetric = z.object({
  name: metricNameSchema,
  aggregation: z.literal('doc_count').describe('The aggregation type of the metric.'),
  filter: metricFilterSchema.optional(),
});

const metricCustomBasicMetric = z.object({
  name: metricNameSchema,
  aggregation: z.literal('sum').describe('The aggregation type of the metric.'),
  field: z.string().max(MAX_KEYWORD_LENGTH).describe('The field of the metric.'),
  filter: metricFilterSchema.optional(),
});

const metricCustomMetricDef = z.object({
  metrics: z
    .array(z.union([metricCustomBasicMetric, metricCustomDocCountMetric]))
    .max(MAX_ARRAY_LENGTH)
    .describe('List of metrics with their name, aggregation type, and field.'),
  equation: z.string().max(MAX_KEYWORD_LENGTH).describe('The equation to calculate the metric.'),
});
const metricCustomIndicatorTypeSchema = z.literal('sli.metric.custom');
const metricCustomIndicatorSchema = z
  .object({
    type: metricCustomIndicatorTypeSchema.describe('The type of indicator.'),
    params: z
      .object({
        index: indexSchema,
        good: metricCustomMetricDef.describe('An object defining the "good" metrics and equation'),
        total: metricCustomMetricDef.describe(
          'An object defining the "total" metrics and equation'
        ),
        timestampField: timestampFieldSchema,
        filter: querySchema.describe('the KQL query to filter the documents with.').optional(),
        dataViewId: dataViewIdSchema.optional(),
      })
      .describe('An object containing the indicator parameters.'),
  })
  .meta({
    id: 'SLOIndicatorPropertiesCustomMetric',
    description: 'Defines properties for a custom metric indicator type',
  });

const rangeHistogramMetricType = z.literal('range');
const rangeBasedHistogramMetricDef = z.object({
  field: z.string().max(MAX_KEYWORD_LENGTH).describe('The field use to aggregate the good events.'),
  aggregation: rangeHistogramMetricType.describe('The type of aggregation to use.'),
  from: z
    .number()
    .describe('The starting value of the range. Only required for "range" aggregations.'),
  to: z.number().describe('The ending value of the range. Only required for "range" aggregations.'),
  filter: querySchema.describe('The filter for events.').optional(),
});

const valueCountHistogramMetricType = z.literal('value_count');
const valueCountBasedHistogramMetricDef = z.object({
  field: z.string().max(MAX_KEYWORD_LENGTH).describe('The field use to aggregate the good events.'),
  aggregation: valueCountHistogramMetricType.describe('The type of aggregation to use.'),
  filter: querySchema.describe('The filter for events.').optional(),
});

const histogramMetricDef = z.union([
  valueCountBasedHistogramMetricDef,
  rangeBasedHistogramMetricDef,
]);

const histogramIndicatorTypeSchema = z.literal('sli.histogram.custom');
const histogramIndicatorSchema = z
  .object({
    type: histogramIndicatorTypeSchema.describe('The type of indicator.'),
    params: z
      .object({
        index: indexSchema,
        timestampField: timestampFieldSchema,
        good: histogramMetricDef.describe('An object defining the "good" events'),
        total: histogramMetricDef.describe('An object defining the "total" events'),
        filter: querySchema.describe('the KQL query to filter the documents with.').optional(),
        dataViewId: dataViewIdSchema.optional(),
      })
      .describe('An object containing the indicator parameters.'),
  })
  .meta({
    id: 'SLOIndicatorPropertiesHistogram',
    description: 'Defines properties for a histogram indicator type',
  });

const syntheticsParamSchema = z.object({
  value: allOrAnyString,
  label: allOrAnyString,
});
const syntheticsAvailabilityIndicatorTypeSchema = z.literal('sli.synthetics.availability');
const syntheticsAvailabilityIndicatorSchema = z
  .object({
    type: syntheticsAvailabilityIndicatorTypeSchema.describe('The type of indicator.'),
    params: z
      .object({
        monitorIds: z
          .array(syntheticsParamSchema)
          .max(MAX_ARRAY_LENGTH)
          .describe('The monitors to create the SLO from'),
        index: indexSchema,
        tags: z
          .array(syntheticsParamSchema)
          .max(MAX_ARRAY_LENGTH)
          .describe('The tags to filter the monitors by')
          .optional(),
        projects: z
          .array(syntheticsParamSchema)
          .max(MAX_ARRAY_LENGTH)
          .describe('The projects to filter the monitors by')
          .optional(),
        filter: querySchema.describe('the KQL query to filter the documents with.').optional(),
        dataViewId: dataViewIdSchema.optional(),
      })
      .describe('An object containing the indicator parameters.'),
  })
  .meta({
    id: 'SLOIndicatorPropertiesSyntheticsAvailability',
    description: 'Defines properties for a synthetics availability indicator type',
  });

const indicatorTypesSchema = z
  .union([
    apmTransactionDurationIndicatorTypeSchema,
    apmTransactionErrorRateIndicatorTypeSchema,
    syntheticsAvailabilityIndicatorTypeSchema,
    kqlCustomIndicatorTypeSchema,
    metricCustomIndicatorTypeSchema,
    timesliceMetricIndicatorTypeSchema,
    histogramIndicatorTypeSchema,
  ])
  .describe('The type of indicator.');

/**
 * Codec between a comma separated list of indicator types
 * (e.g. `sli.kql.custom,sli.apm.transactionDuration`) and an array of indicator types.
 * `ArrayFromString` from @kbn/zod-helpers is decode-only (`z.preprocess`) and cannot
 * express the encode direction required for io-ts parity, hence the hand-rolled codec.
 */
const indicatorTypesArraySchema = z.codec(
  z
    .string()
    .max(MAX_KEYWORD_LENGTH)
    .describe(
      'A comma separated list of indicator types, for example sli.kql.custom,sli.apm.transactionDuration'
    ),
  z.array(indicatorTypesSchema),
  {
    decode: (value) => value.split(',') as Array<z.output<typeof indicatorTypesSchema>>,
    encode: (values) => values.join(','),
  }
);

const indicatorUnion = z.discriminatedUnion('type', [
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  syntheticsAvailabilityIndicatorSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
  timesliceMetricIndicatorSchema,
  histogramIndicatorSchema,
]);

// Derives the OAS discriminator mapping from the variants so each component
// name stays defined exactly once, on the variant's `.meta({ id })`.
const componentRef = (schema: z.ZodType): string => {
  const id = schema.meta()?.id;
  if (!id) {
    throw new Error('every indicator schema must declare a .meta({ id }) for the OAS mapping');
  }
  return `#/components/schemas/${id}`;
};

const indicatorSchema = indicatorUnion.meta({
  id: 'SLOIndicator',
  description: 'The indicator to use to compute the SLI',
  openapi: {
    discriminator: {
      propertyName: 'type',
      mapping: Object.fromEntries(
        indicatorUnion.options.map((variant) => [variant.shape.type.value, componentRef(variant)])
      ),
    },
  },
});

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
