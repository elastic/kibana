/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal TypeScript types mirroring the ES|QL subset of LensApiState.
 *
 * These are intentionally decoupled from the server-side @kbn/config-schema
 * definitions so the Vite-built client bundle stays independent.
 */

// ---------------------------------------------------------------------------
// Dataset
// ---------------------------------------------------------------------------

export interface EsqlDataset {
  type: 'esql';
  query: string;
}

export interface TableDataset {
  type: 'table';
  table: unknown;
}

export type Dataset = EsqlDataset | TableDataset;

// ---------------------------------------------------------------------------
// ES|QL column reference
// ---------------------------------------------------------------------------

export interface EsqlColumn {
  operation: 'value';
  column: string;
  label?: string;
  format?: string;
  decimals?: number;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Chart type discriminated unions (ES|QL variants only)
// ---------------------------------------------------------------------------

export interface XYLayerESQL {
  dataset: Dataset;
  type:
    | 'line'
    | 'bar'
    | 'bar_stacked'
    | 'bar_horizontal'
    | 'bar_horizontal_stacked'
    | 'bar_percentage'
    | 'bar_horizontal_percentage'
    | 'area'
    | 'area_stacked'
    | 'area_percentage';
  x?: EsqlColumn;
  y: EsqlColumn[];
  breakdown_by?: EsqlColumn & { color?: unknown; collapse_by?: string };
}

export interface XYLegendOutside {
  visibility: 'auto' | 'visible' | 'hidden';
  position?: 'top' | 'bottom' | 'left' | 'right';
  inside?: false;
}

export interface XYLegendInside {
  visibility: 'auto' | 'visible' | 'hidden';
  inside: true;
  alignment?: 'top_right' | 'bottom_right' | 'top_left' | 'bottom_left';
}

export type XYLegend = XYLegendOutside | XYLegendInside;

export interface XYAxisConfig {
  x?: {
    title?: { value?: string; visible?: boolean };
    scale?: 'ordinal' | 'temporal' | 'linear';
  };
  left?: {
    title?: { value?: string; visible?: boolean };
    scale?: 'time' | 'linear' | 'log' | 'sqrt';
  };
  right?: {
    title?: { value?: string; visible?: boolean };
    scale?: 'time' | 'linear' | 'log' | 'sqrt';
  };
}

export interface XYDecorations {
  show_value_labels?: boolean;
  fill_opacity?: number;
  point_visibility?: 'auto' | 'always' | 'never';
  line_interpolation?: 'linear' | 'smooth' | 'stepped';
}

export interface XYState {
  type: 'xy';
  title?: string;
  layers: XYLayerESQL[];
  legend?: XYLegend;
  axis?: XYAxisConfig;
  decorations?: XYDecorations;
}

// ---------------------------------------------------------------------------
// Metric
// ---------------------------------------------------------------------------

export interface MetricPrimary extends EsqlColumn {
  type: 'primary';
  sub_label?: string;
  background_chart?: {
    type: 'bar';
    max_value: EsqlColumn;
    direction?: 'vertical' | 'horizontal';
  };
}

export interface MetricSecondary extends EsqlColumn {
  type: 'secondary';
  prefix?: string;
}

export interface MetricState {
  type: 'metric';
  title?: string;
  dataset: Dataset;
  metrics: Array<MetricPrimary | MetricSecondary>;
  breakdown_by?: EsqlColumn & { columns?: number };
}

// ---------------------------------------------------------------------------
// Gauge
// ---------------------------------------------------------------------------

export interface GaugeState {
  type: 'gauge';
  title?: string;
  dataset: Dataset;
  metric: EsqlColumn & {
    min?: EsqlColumn;
    max?: EsqlColumn;
    goal?: EsqlColumn;
  };
  shape?:
    | { type: 'bullet'; direction?: 'horizontal' | 'vertical' }
    | { type: 'circle' | 'semi_circle' | 'arc' };
}

// ---------------------------------------------------------------------------
// Pie / Donut
// ---------------------------------------------------------------------------

export interface PieState {
  type: 'pie' | 'donut';
  title?: string;
  dataset: Dataset;
  metrics: Array<EsqlColumn>;
  group_by?: Array<EsqlColumn & { collapse_by?: string }>;
  donut_hole?: 'none' | 'small' | 'medium' | 'large';
  legend?: {
    visible?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

export interface HeatmapState {
  type: 'heatmap';
  title?: string;
  dataset: Dataset;
  metric: EsqlColumn;
  x: EsqlColumn;
  y?: EsqlColumn;
  legend?: { visible?: boolean; position?: string };
}

// ---------------------------------------------------------------------------
// Tag Cloud
// ---------------------------------------------------------------------------

export interface TagcloudState {
  type: 'tag_cloud';
  title?: string;
  dataset: Dataset;
  metric: EsqlColumn;
  tag_by: EsqlColumn;
  orientation?: 'horizontal' | 'vertical' | 'angled';
  font_size?: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Treemap
// ---------------------------------------------------------------------------

export interface TreemapState {
  type: 'treemap';
  title?: string;
  dataset: Dataset;
  metrics: Array<EsqlColumn>;
  group_by?: Array<EsqlColumn & { collapse_by?: string }>;
}

// ---------------------------------------------------------------------------
// Waffle
// ---------------------------------------------------------------------------

export interface WaffleState {
  type: 'waffle';
  title?: string;
  dataset: Dataset;
  metrics: Array<EsqlColumn>;
  group_by?: Array<EsqlColumn & { collapse_by?: string }>;
}

// ---------------------------------------------------------------------------
// Mosaic
// ---------------------------------------------------------------------------

export interface MosaicState {
  type: 'mosaic';
  title?: string;
  dataset: Dataset;
  metric: EsqlColumn;
  group_by?: Array<EsqlColumn & { collapse_by?: string }>;
  group_breakdown_by?: Array<EsqlColumn & { collapse_by?: string }>;
}

// ---------------------------------------------------------------------------
// Data Table
// ---------------------------------------------------------------------------

export interface DatatableState {
  type: 'data_table';
  title?: string;
  dataset: Dataset;
  metrics?: Array<EsqlColumn>;
  rows?: Array<EsqlColumn>;
}

// ---------------------------------------------------------------------------
// Legacy Metric
// ---------------------------------------------------------------------------

export interface LegacyMetricState {
  type: 'legacy_metric';
  title?: string;
  dataset: Dataset;
  metric: EsqlColumn;
}

// ---------------------------------------------------------------------------
// Region Map (fallback)
// ---------------------------------------------------------------------------

export interface RegionMapState {
  type: 'region_map';
  title?: string;
  dataset: Dataset;
  metric: EsqlColumn;
  region: EsqlColumn;
}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type LensApiStateESQL =
  | XYState
  | MetricState
  | GaugeState
  | PieState
  | HeatmapState
  | TagcloudState
  | TreemapState
  | WaffleState
  | MosaicState
  | DatatableState
  | LegacyMetricState
  | RegionMapState;

// ---------------------------------------------------------------------------
// ES|QL data format returned by the server
// ---------------------------------------------------------------------------

export interface EsqlColumnMeta {
  name: string;
  type: string;
}

export interface EsqlData {
  columns: EsqlColumnMeta[];
  values: unknown[][];
}

// ---------------------------------------------------------------------------
// structuredContent payload
// ---------------------------------------------------------------------------

export interface LensChartPayload {
  visualization: LensApiStateESQL;
  data: EsqlData;
}
