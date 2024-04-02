/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  allOrAnyString,
  allOrAnyStringOrArray,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  budgetingMethodSchema,
  dateType,
  groupingsSchema,
  groupSummarySchema,
  histogramIndicatorSchema,
  indicatorSchema,
  indicatorTypesSchema,
  kqlCustomIndicatorSchema,
  kqlWithFiltersSchema,
  metaSchema,
  metricCustomIndicatorSchema,
  objectiveSchema,
  querySchema,
  settingsSchema,
  sloIdSchema,
  summarySchema,
  syntheticsAvailabilityIndicatorSchema,
  tagsSchema,
  timesliceMetricBasicMetricWithField,
  timesliceMetricDocCountMetric,
  timesliceMetricIndicatorSchema,
  timesliceMetricPercentileMetric,
  timeWindowSchema,
  timeWindowTypeSchema,
} from '../schema';

const sloResponseSchema = t.intersection([
  t.type({
    id: sloIdSchema,
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    revision: t.number,
    settings: settingsSchema,
    enabled: t.boolean,
    tags: tagsSchema,
    groupBy: allOrAnyStringOrArray,
    createdAt: dateType,
    updatedAt: dateType,
    version: t.number,
  }),
  t.partial({
    instanceId: allOrAnyString,
    remoteName: t.string,
    kibanaUrl: t.string,
  }),
]);

const sloWithSummaryResponseSchema = t.intersection([
  sloResponseSchema,
  t.type({ summary: summarySchema, groupings: groupingsSchema }),
  t.partial({ meta: metaSchema }),
]);

type SLOResponse = t.OutputOf<typeof sloResponseSchema>;
type SLOWithSummaryResponse = t.OutputOf<typeof sloWithSummaryResponseSchema>;

type BudgetingMethod = t.OutputOf<typeof budgetingMethodSchema>;
type TimeWindowType = t.OutputOf<typeof timeWindowTypeSchema>;
type TimeWindow = t.OutputOf<typeof timeWindowSchema>;
type IndicatorType = t.OutputOf<typeof indicatorTypesSchema>;
type Indicator = t.OutputOf<typeof indicatorSchema>;
type Objective = t.OutputOf<typeof objectiveSchema>;
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
type GroupSummary = t.TypeOf<typeof groupSummarySchema>;
type KqlWithFiltersSchema = t.TypeOf<typeof kqlWithFiltersSchema>;
type QuerySchema = t.TypeOf<typeof querySchema>;

export { sloWithSummaryResponseSchema };

export type {
  BudgetingMethod,
  SLOResponse,
  SLOWithSummaryResponse,
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  SyntheticsAvailabilityIndicator,
  IndicatorType,
  Indicator,
  Objective,
  MetricCustomIndicator,
  TimesliceMetricIndicator,
  TimesliceMetricBasicMetricWithField,
  TimesclieMetricPercentileMetric,
  TimesliceMetricDocCountMetric,
  HistogramIndicator,
  KQLCustomIndicator,
  TimeWindow,
  TimeWindowType,
  GroupSummary,
  KqlWithFiltersSchema,
  QuerySchema,
};
