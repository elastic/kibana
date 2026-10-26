/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

//
// Do not change constant value - part of public REST APIs
//
export const EMBEDDABLE_PATTERN_ANALYSIS_TYPE = 'aiops_pattern_analysis' as const;

export const PATTERN_ANALYSIS_DATA_VIEW_REF_NAME = 'aiopsPatternAnalysisEmbeddableDataViewId';

//
// Do not change constant values - part of public REST APIs and persisted embeddable state.
//
export const MINIMUM_TIME_RANGE_OPTION = {
  NO_MINIMUM: 'no_minimum',
  ONE_WEEK: '1_week',
  ONE_MONTH: '1_month',
  THREE_MONTHS: '3_months',
  SIX_MONTHS: '6_months',
} as const;

export type MinimumTimeRangeStoredOption =
  (typeof MINIMUM_TIME_RANGE_OPTION)[keyof typeof MINIMUM_TIME_RANGE_OPTION];

export const DEFAULT_MINIMUM_TIME_RANGE = MINIMUM_TIME_RANGE_OPTION.NO_MINIMUM;
