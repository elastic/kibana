/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110895

export type {
  DateRange,
  DateRangeInfo,
  GetDateRangeInfoParams,
  BuildAggregationOpts,
  ParsedAggregationGroup,
  ParsedAggregationResults,
  TimeSeriesResult,
  TimeSeriesResultRow,
  MetricResult,
} from './data';
export {
  MAX_INTERVALS,
  getDateRangeInfo,
  getTooManyIntervalsErrorMessage,
  getDateStartAfterDateEndErrorMessage,
  BUCKET_SELECTOR_PATH_NAME,
  BUCKET_SELECTOR_FIELD,
  DEFAULT_GROUPS,
  MAX_SOURCE_FIELDS_TO_COPY,
  isCountAggregation,
  isGroupAggregation,
  buildAggregation,
  UngroupedGroupId,
  parseAggregationResults,
} from './data';
export const BASE_TRIGGERS_ACTIONS_UI_API_PATH = '/internal/triggers_actions_ui';
export { INTERVAL_STRING_RE, parseInterval } from './parse_interval';
export type { ExperimentalFeatures } from './experimental_features';
export {
  allowedExperimentalValues,
  parseExperimentalConfigValue,
  isValidExperimentalValue,
  getExperimentalAllowedValues,
} from './experimental_features';
export { NORMALIZED_FIELD_TYPES } from './normalized_field_types';
