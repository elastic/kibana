/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutDirection, MetricStyle } from '@elastic/charts';
import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import type { CollapseFunction } from '@kbn/visualizations-plugin/common';
import type { EuiColorPalettePickerPaletteProps, EuiThemeShape } from '@elastic/eui';
import type { LayerType } from '../../../common/types';

export type ValueFontMode = Exclude<MetricStyle['valueFontSize'], number>;

interface SecondaryTrendType {
  visuals: 'icon' | 'value' | 'both';
  palette: { name: string; stops: [string, string, string] };
  baselineValue: number | 'primary';
}

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
  secondaryColorMode?: 'none' | 'static' | 'dynamic';
  secondaryColor?: string;
  secondaryTrend?: SecondaryTrendType;
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

export type EuiColorPalettePickerPaletteFixedProps = Omit<
  Extract<EuiColorPalettePickerPaletteProps, { type: 'fixed' }>,
  'palette'
> & { palette: [string, string, string] };

export type TrendEUIColors = (
  | keyof EuiThemeShape['colors']['LIGHT']
  | keyof EuiThemeShape['colors']['vis']
) & {};
