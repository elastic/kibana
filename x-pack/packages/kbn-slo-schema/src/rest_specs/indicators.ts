/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import {
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
} from '../schema';

type IndicatorType = t.OutputOf<typeof indicatorTypesSchema>;
type Indicator = t.OutputOf<typeof indicatorSchema>;

type APMTransactionErrorRateIndicator = t.OutputOf<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = t.OutputOf<typeof apmTransactionDurationIndicatorSchema>;

type SyntheticsAvailabilityIndicator = t.OutputOf<typeof syntheticsAvailabilityIndicatorSchema>;

type MetricCustomIndicator = t.OutputOf<typeof metricCustomIndicatorSchema>;
type TimesliceMetricIndicator = t.OutputOf<typeof timesliceMetricIndicatorSchema>;
type TimesliceMetricBasicMetricWithField = t.OutputOf<typeof timesliceMetricBasicMetricWithField>;
type TimesliceMetricDocCountMetric = t.OutputOf<typeof timesliceMetricDocCountMetric>;
type TimesclieMetricPercentileMetric = t.OutputOf<typeof timesliceMetricPercentileMetric>;

type HistogramIndicator = t.OutputOf<typeof histogramIndicatorSchema>;

type KQLCustomIndicator = t.OutputOf<typeof kqlCustomIndicatorSchema>;
type KqlWithFiltersSchema = t.TypeOf<typeof kqlWithFiltersSchema>;
type QuerySchema = t.TypeOf<typeof querySchema>;
type FiltersSchema = t.TypeOf<typeof filtersSchema>;

const filters: FiltersSchema = [
  {
    meta: {
      alias: null,
      disabled: false,
      field: 'log.file.path.keyword',
      index: 'logging-*:service-puppetserver*-id',
      key: 'log.file.path.keyword',
      negate: false,
      params: { query: '/hostfs/var/log/puppetlabs/puppetserver/puppetserver-access.log.json' },
      type: 'phrase',
    },
    query: {
      match_phrase: {
        'log.file.path.keyword':
          '/hostfs/var/log/puppetlabs/puppetserver/puppetserver-access.log.json',
      },
    },
  },
];
type GroupingsSchema = t.TypeOf<typeof groupingsSchema>;

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
