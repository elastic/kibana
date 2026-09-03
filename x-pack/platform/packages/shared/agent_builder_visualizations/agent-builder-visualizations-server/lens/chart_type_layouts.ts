/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';

export interface ChartTypeLayout {
  readonly h: number;
  readonly defaultW: number;
  readonly allowedW: readonly number[];
  readonly minW: number;
  readonly maxPerRow: number;
}

export const chartTypeLayouts: { readonly [K in SupportedChartType]: ChartTypeLayout } = {
  [SupportedChartType.Metric]: chartTypeRegistry[SupportedChartType.Metric].layout,
  [SupportedChartType.Gauge]: chartTypeRegistry[SupportedChartType.Gauge].layout,
  [SupportedChartType.XY]: chartTypeRegistry[SupportedChartType.XY].layout,
  [SupportedChartType.Heatmap]: chartTypeRegistry[SupportedChartType.Heatmap].layout,
  [SupportedChartType.Tagcloud]: chartTypeRegistry[SupportedChartType.Tagcloud].layout,
  [SupportedChartType.RegionMap]: chartTypeRegistry[SupportedChartType.RegionMap].layout,
  [SupportedChartType.Datatable]: chartTypeRegistry[SupportedChartType.Datatable].layout,
  [SupportedChartType.Pie]: chartTypeRegistry[SupportedChartType.Pie].layout,
  [SupportedChartType.Treemap]: chartTypeRegistry[SupportedChartType.Treemap].layout,
  [SupportedChartType.Waffle]: chartTypeRegistry[SupportedChartType.Waffle].layout,
  [SupportedChartType.Mosaic]: chartTypeRegistry[SupportedChartType.Mosaic].layout,
};
