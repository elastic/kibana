/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutDirection, MetricStyle, SecondaryMetricProps } from '@elastic/charts';
import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import type { CollapseFunction, LensLayerType as LayerType } from '@kbn/lens-common';

export type ValueFontMode = Exclude<MetricStyle['valueFontSize'], number>;
export type PrimaryMetricFontSize = ValueFontMode;

export type PrimaryMetricPosition = MetricStyle['valuePosition'];

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
  secondaryPrefix?: string; // legacy state property
  secondaryLabel?: string;
  secondaryTrend?: SecondaryTrend;
  progressDirection?: LayoutDirection;
  showBar?: boolean;
  titlesTextAlign?: MetricStyle['titlesTextAlign'];
  valuesTextAlign?: 'left' | 'right' | 'center'; // legacy state property
  secondaryAlign?: MetricStyle['extraTextAlign'];
  primaryAlign?: MetricStyle['valueTextAlign'];
  iconAlign?: MetricStyle['iconAlign'];
  valueFontMode?: ValueFontMode;
  titleWeight?: MetricStyle['titleWeight'];
  primaryPosition?: MetricStyle['valuePosition'];
  secondaryLabelPosition?: SecondaryMetricProps['labelPosition'];
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

  applyColorTo?: 'background' | 'value'; // Used for coordination between dimension editor sections
}

export type TitleFontWeight = MetricStyle['titleWeight'];

export type IconPosition = MetricStyle['iconAlign'];

export type Alignment = 'left' | 'center' | 'right';
