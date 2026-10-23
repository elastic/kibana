/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { z } from '@kbn/zod';
import type {
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  histogramIndicatorSchema,
  indicatorSchema,
  indicatorTypesSchema,
  kqlCustomIndicatorSchema,
  kqlWithFiltersSchema,
  metricCustomIndicatorSchema,
  querySchema,
  filtersSchema,
  groupingsSchema,
  syntheticsAvailabilityIndicatorSchema,
  timesliceMetricBasicMetricWithField,
  timesliceMetricDocCountMetric,
  timesliceMetricIndicatorSchema,
  timesliceMetricPercentileMetric,
} from '../schema/zod';

type IndicatorType = z.input<typeof indicatorTypesSchema>;
type Indicator = z.input<typeof indicatorSchema>;

type APMTransactionErrorRateIndicator = z.input<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = z.input<typeof apmTransactionDurationIndicatorSchema>;

type SyntheticsAvailabilityIndicator = z.input<typeof syntheticsAvailabilityIndicatorSchema>;

type MetricCustomIndicator = z.input<typeof metricCustomIndicatorSchema>;
type TimesliceMetricIndicator = z.input<typeof timesliceMetricIndicatorSchema>;
type TimesliceMetricBasicMetricWithField = z.input<typeof timesliceMetricBasicMetricWithField>;
type TimesliceMetricDocCountMetric = z.input<typeof timesliceMetricDocCountMetric>;
type TimesclieMetricPercentileMetric = z.input<typeof timesliceMetricPercentileMetric>;

type HistogramIndicator = z.input<typeof histogramIndicatorSchema>;

type KQLCustomIndicator = z.input<typeof kqlCustomIndicatorSchema>;
type KqlWithFiltersSchema = z.output<typeof kqlWithFiltersSchema>;
type QuerySchema = z.output<typeof querySchema>;
type FiltersSchema = z.output<typeof filtersSchema>;
type GroupingsSchema = z.output<typeof groupingsSchema>;

export type {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  SyntheticsAvailabilityIndicator,
  IndicatorType,
  Indicator,
  MetricCustomIndicator,
  TimesliceMetricIndicator,
  TimesliceMetricBasicMetricWithField,
  TimesclieMetricPercentileMetric,
  TimesliceMetricDocCountMetric,
  HistogramIndicator,
  KQLCustomIndicator,
  KqlWithFiltersSchema,
  QuerySchema,
  FiltersSchema,
  GroupingsSchema,
};
