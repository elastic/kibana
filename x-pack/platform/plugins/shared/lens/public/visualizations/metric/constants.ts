/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OptionalKeys } from 'utility-types';
import { MetricVisualizationState } from './types';

export const LENS_METRIC_ID = 'lnsMetric';

export const GROUP_ID = {
  METRIC: 'metric',
  SECONDARY_METRIC: 'secondaryMetric',
  MAX: 'max',
  BREAKDOWN_BY: 'breakdownBy',
  TREND_METRIC: 'trendMetric',
  TREND_SECONDARY_METRIC: 'trendSecondaryMetric',
  TREND_TIME: 'trendTime',
  TREND_BREAKDOWN_BY: 'trendBreakdownBy',
} as const;

type MetricVisualizationStateOptionals = Pick<
  MetricVisualizationState,
  OptionalKeys<MetricVisualizationState>
>;

/**
 * Defaults for select optional Metric vis state options
 */
export const metricStateDefaults: Required<
  Pick<
    MetricVisualizationStateOptionals,
    'titlesTextAlign' | 'valuesTextAlign' | 'iconAlign' | 'valueFontMode'
  >
> = {
  titlesTextAlign: 'left',
  valuesTextAlign: 'right',
  iconAlign: 'left',
  valueFontMode: 'default',
};
