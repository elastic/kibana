/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './composite_slo';
export * from './composite_slo_summary_index';

export { ALL_VALUE, SLO_GROUPINGS_PREFIX, SLO_STATUS } from '../constants';
export type { SLOStatus, TransformHealthResponse } from './zod';
export { timesliceMetricComparatorMapping } from './zod';

// Zod schemas, exported with a temporary `…Zod` suffix that is dropped in a
// follow-up commit of the zod migration.
export {
  // common
  allOrAnyString as allOrAnyStringZod,
  allOrAnyStringOrArray as allOrAnyStringOrArrayZod,
  dateRangeSchema as dateRangeSchemaZod,
  dateType as dateTypeZod,
  errorBudgetSchema as errorBudgetSchemaZod,
  groupingsSchema as groupingsSchemaZod,
  statusSchema as statusSchemaZod,
  summarySchema as summarySchemaZod,
  metaSchema as metaSchemaZod,
  groupSummarySchema as groupSummarySchemaZod,
  remoteSchema as remoteSchemaZod,
  // duration
  durationType as durationTypeZod,
  // indicators
  kqlQuerySchema as kqlQuerySchemaZod,
  kqlWithFiltersSchema as kqlWithFiltersSchemaZod,
  querySchema as querySchemaZod,
  filtersSchema as filtersSchemaZod,
  apmTransactionDurationIndicatorSchema as apmTransactionDurationIndicatorSchemaZod,
  apmTransactionDurationIndicatorTypeSchema as apmTransactionDurationIndicatorTypeSchemaZod,
  apmTransactionErrorRateIndicatorSchema as apmTransactionErrorRateIndicatorSchemaZod,
  apmTransactionErrorRateIndicatorTypeSchema as apmTransactionErrorRateIndicatorTypeSchemaZod,
  syntheticsAvailabilityIndicatorSchema as syntheticsAvailabilityIndicatorSchemaZod,
  syntheticsAvailabilityIndicatorTypeSchema as syntheticsAvailabilityIndicatorTypeSchemaZod,
  kqlCustomIndicatorSchema as kqlCustomIndicatorSchemaZod,
  kqlCustomIndicatorTypeSchema as kqlCustomIndicatorTypeSchemaZod,
  metricCustomIndicatorSchema as metricCustomIndicatorSchemaZod,
  metricCustomIndicatorTypeSchema as metricCustomIndicatorTypeSchemaZod,
  metricCustomDocCountMetric as metricCustomDocCountMetricZod,
  metricCustomBasicMetric as metricCustomBasicMetricZod,
  timesliceMetricIndicatorSchema as timesliceMetricIndicatorSchemaZod,
  timesliceMetricIndicatorTypeSchema as timesliceMetricIndicatorTypeSchemaZod,
  timesliceMetricMetricDef as timesliceMetricMetricDefZod,
  timesliceMetricBasicMetricWithField as timesliceMetricBasicMetricWithFieldZod,
  timesliceMetricDocCountMetric as timesliceMetricDocCountMetricZod,
  timesliceMetricPercentileMetric as timesliceMetricPercentileMetricZod,
  histogramIndicatorTypeSchema as histogramIndicatorTypeSchemaZod,
  histogramIndicatorSchema as histogramIndicatorSchemaZod,
  indicatorSchema as indicatorSchemaZod,
  indicatorTypesArraySchema as indicatorTypesArraySchemaZod,
  indicatorTypesSchema as indicatorTypesSchemaZod,
  // slo
  boundedProjectRoutingSchema as boundedProjectRoutingSchemaZod,
  budgetingMethodSchema as budgetingMethodSchemaZod,
  dashboardsWithIdSchema as dashboardsWithIdSchemaZod,
  groupBySchema as groupBySchemaZod,
  objectiveSchema as objectiveSchemaZod,
  occurrencesBudgetingMethodSchema as occurrencesBudgetingMethodSchemaZod,
  optionalSettingsSchema as optionalSettingsSchemaZod,
  settingsSchema as settingsSchemaZod,
  sloDefinitionSchema as sloDefinitionSchemaZod,
  sloIdSchema as sloIdSchemaZod,
  storedSloDefinitionSchema as storedSloDefinitionSchemaZod,
  tagsSchema as tagsSchemaZod,
  targetSchema as targetSchemaZod,
  timeslicesBudgetingMethodSchema as timeslicesBudgetingMethodSchemaZod,
  // time_window
  rollingTimeWindowSchema as rollingTimeWindowSchemaZod,
  rollingTimeWindowTypeSchema as rollingTimeWindowTypeSchemaZod,
  calendarAlignedTimeWindowSchema as calendarAlignedTimeWindowSchemaZod,
  calendarAlignedTimeWindowTypeSchema as calendarAlignedTimeWindowTypeSchemaZod,
  timeWindowSchema as timeWindowSchemaZod,
  timeWindowTypeSchema as timeWindowTypeSchemaZod,
  // settings
  serverlessSloSettingsSchema as serverlessSloSettingsSchemaZod,
  sloSettingsSchema as sloSettingsSchemaZod,
  storedSloSettingsSchema as storedSloSettingsSchemaZod,
  // health
  sloHealthSchema as sloHealthSchemaZod,
  transformHealthSchema as transformHealthSchemaZod,
  // slo_template
  sloTemplateSchema as sloTemplateSchemaZod,
  storedSloTemplateSchema as storedSloTemplateSchemaZod,
} from './zod';

// Unsuffixed: a helper.
export { is } from './zod';
