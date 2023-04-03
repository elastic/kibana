/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

export enum TIME_SERIES_METRIC_TYPES {
  HISTOGRAM = 'histogram',
  COUNTER = 'counter',
  GAUGE = 'gauge',
  SUMMARY = 'summary',
}
export const isCounterTimeSeriesMetric = (field?: DataViewField) =>
  field?.timeSeriesMetric === TIME_SERIES_METRIC_TYPES.COUNTER;
