/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutDirection, MetricStyle } from '@elastic/charts';
import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import type { CollapseFunction } from '@kbn/visualizations-plugin/common';
import type { LayerType } from '../../../common/types';

export type ValueFontMode = Exclude<MetricStyle['valueFontSize'], number>;

export type SecondaryTrendType = 'none' | 'static' | 'dynamic';

export type SecondaryTrend =
  | { type: 'none' }
  | { type: 'static'; color: string }
  | {
      type: 'dynamic';
      visuals: 'icon' | 'value' | 'both';
      paletteId: string;
      reversed: boolean;
      baselineValue: number | 'primary';
    };

export interface MetricVisualizationState {
  layerId: string;
  layerType: LayerType;
  metricAccessor?: string;
  secondaryMetricAccessor?: string;
  maxAccessor?: string;
  breakdownByAccessor?: string;
  // the dimensions can optionally be single numbers
  // computed by collapsing all rows
  collapseFn?: CollapseFunction;
  subtitle?: string;
  secondaryPrefix?: string;
  secondaryTrend?: SecondaryTrend;
  progressDirection?: LayoutDirection;
  showBar?: boolean;
  titlesTextAlign?: MetricStyle['titlesTextAlign'];
  valuesTextAlign?: MetricStyle['valuesTextAlign'];
  iconAlign?: MetricStyle['iconAlign'];
  valueFontMode?: ValueFontMode;
  color?: string;
  icon?: string;
  palette?: PaletteOutput<CustomPaletteParams>;
  maxCols?: number;

  trendlineLayerId?: string;
  trendlineLayerType?: LayerType;
  trendlineTimeAccessor?: string;
  trendlineMetricAccessor?: string;
  trendlineSecondaryMetricAccessor?: string;
  trendlineBreakdownByAccessor?: string;
}
