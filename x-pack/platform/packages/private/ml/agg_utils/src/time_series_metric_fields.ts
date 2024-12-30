/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

/**
 * All available types for time series metric fields
 */
export enum TIME_SERIES_METRIC_TYPES {
  HISTOGRAM = 'histogram',
  COUNTER = 'counter',
  GAUGE = 'gauge',
  SUMMARY = 'summary',
}

/**
 * Check if DataViewField is a 'counter' time series metric field
 * @param field optional DataViewField
 * @returns a boolean
 */
export const isCounterTimeSeriesMetric = (field?: DataViewField) =>
  field?.timeSeriesMetric === TIME_SERIES_METRIC_TYPES.COUNTER;

/**
 * Check if DataViewField is a 'gauge' time series metric field
 * @param field optional DataViewField
 * @returns a boolean
 */
export const isGaugeTimeSeriesMetric = (field?: DataViewField) =>
  field?.timeSeriesMetric === TIME_SERIES_METRIC_TYPES.GAUGE;
