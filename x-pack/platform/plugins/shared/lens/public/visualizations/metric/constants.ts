/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OptionalKeys } from 'utility-types';
import type { MetricVisualizationState } from './types';

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

type MetricStateOptinalsWithDefault = Pick<
  MetricVisualizationStateOptionals,
  | 'titlesTextAlign'
  | 'primaryAlign'
  | 'secondaryAlign'
  | 'iconAlign'
  | 'valueFontMode'
  | 'primaryPosition'
  | 'titleWeight'
  | 'secondaryLabelPosition'
  | 'applyColorTo'
>;

type MetricStateDefaults = Required<MetricStateOptinalsWithDefault>;

export const legacyMetricStateDefaults: Pick<MetricStateDefaults, 'iconAlign'> = {
  iconAlign: 'left',
};

/** Defaults for select optional Metric vis state options */
export const metricStateDefaults: MetricStateDefaults = {
  titlesTextAlign: 'left',
  primaryAlign: 'right',
  secondaryAlign: 'right',
  iconAlign: 'right',
  valueFontMode: 'default',
  primaryPosition: 'bottom',
  titleWeight: 'bold',
  secondaryLabelPosition: 'before',
  applyColorTo: 'background',
};

export type MetricLayoutWithDefault = Required<
  Pick<MetricStateOptinalsWithDefault, 'titlesTextAlign' | 'titleWeight' | 'primaryAlign'>
> & {
  iconAlign?: MetricStateOptinalsWithDefault['iconAlign'];
  secondaryAlign?: MetricStateOptinalsWithDefault['secondaryAlign'];
};

export const METRIC_LAYOUT_BY_POSITION: Record<'bottom' | 'top', MetricLayoutWithDefault> = {
  bottom: {
    titlesTextAlign: 'left',
    titleWeight: 'bold',
    primaryAlign: 'right',
    iconAlign: 'right',
    secondaryAlign: 'right',
  },
  top: {
    titlesTextAlign: 'left',
    titleWeight: 'normal',
    primaryAlign: 'left',
    iconAlign: 'right',
    secondaryAlign: 'left',
  },
};

export const SECONDARY_DEFAULT_STATIC_COLOR = '#E4E8F1';
