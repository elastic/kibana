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
  ParsedAggregationResults,
  TimeSeriesResult,
  TimeSeriesResultRow,
  MetricResult,
  ParseAggregationResultsOpts,
} from './data';
export {
  BUCKET_SELECTOR_FIELD,
  DEFAULT_GROUPS,
  isCountAggregation,
  isGroupAggregation,
  isPerRowAggregation,
  buildAggregation,
  UngroupedGroupId,
  parseAggregationResults,
} from './data';
export { NORMALIZED_FIELD_TYPES } from './normalized_field_types';
