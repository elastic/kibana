/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Minimal types for the Lens saved-object fields the converter reads.
//
// Example:
// - The Lens saved-object `attributes` field looks like:
//   {
//     title: string,
//     description?: string,
//     visualizationType: 'lnsXY' | 'lnsLegacyMetric' | 'lnsMetric'
//       | 'lnsPie' | 'lnsDatatable' | 'lnsHeatmap' | 'lnsGauge',
//     state: {
//       datasourceStates: {
//         formBased?: FormBasedDatasourceState,
//         textBased?: TextBasedDatasourceState,
//       },
//       visualization: VisualizationStateXY | VisualizationStateMetric | ...,
//       filters: Filter[],
//       query: { query: string, language: 'kuery' | 'lucene' | 'esql' },
//     },
//     references: [{ id, type, name }],
//   }

export interface LensAttributes {
  title: string;
  description?: string;
  visualizationType: string;
  state: LensState;
}

export interface LensState {
  datasourceStates?: {
    formBased?: FormBasedDatasourceState;
    textBased?: TextBasedDatasourceState;
    indexpattern?: FormBasedDatasourceState; // legacy alias
  };
  visualization?: unknown;
  filters?: Array<Record<string, unknown>>;
  query?: { query: string; language?: string };
  adHocDataViews?: Record<string, unknown>;
}

export interface FormBasedDatasourceState {
  layers: Record<string, FormBasedLayer>;
}

export interface FormBasedLayer {
  columns: Record<string, FormBasedColumn>;
  columnOrder: string[];
  indexPatternId?: string;
  ignoreGlobalFilters?: boolean;
}

export interface FormBasedColumn {
  operationType: string;
  sourceField?: string;
  label?: string;
  isBucketed?: boolean;
  dataType?: 'number' | 'string' | 'date' | 'boolean';
  scale?: 'ratio' | 'ordinal' | 'interval';
  params?: Record<string, unknown>;
  references?: string[];
  filter?: { query?: string; language?: string };
  customLabel?: boolean;
  /** Column-level time shift (e.g. `1w`, `1d`) for "vs. previous" metrics. */
  timeShift?: string;
}

export interface TextBasedDatasourceState {
  layers: Record<string, TextBasedLayer>;
  initialContext?: Record<string, unknown>;
  indexPatternRefs?: Array<{
    id?: string;
    title?: string;
    timeField?: string;
  }>;
}

export interface TextBasedColumn {
  columnId: string;
  fieldName: string;
  label?: string;
  meta?: unknown;
  /** Author's number format, same shape as a form-based column's. */
  params?: { format?: { id?: string; params?: Record<string, unknown> } };
}

export interface TextBasedLayer {
  query: { esql: string };
  columns: TextBasedColumn[];
  index?: string;
  timeField?: string;
  allColumns?: Array<{ columnId: string; fieldName: string }>;
}

// XY visualization state. Only the fields the lowering reads.
export interface XyVisualizationState {
  preferredSeriesType?:
    | 'line'
    | 'area'
    | 'area_stacked'
    | 'area_percentage_stacked'
    | 'bar'
    | 'bar_horizontal'
    | 'bar_horizontal_stacked'
    | 'bar_horizontal_percentage_stacked'
    | 'bar_stacked'
    | 'bar_percentage_stacked';
  layers: Array<XyLayer>;
  axisTitlesVisibilitySettings?: {
    x?: boolean;
    yLeft?: boolean;
    yRight?: boolean;
  };
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
  legend?: { isVisible?: boolean; position?: string };
  curveType?: 'LINEAR' | 'CURVE_MONOTONE_X' | 'CURVE_STEP';
  fittingFunction?: 'None' | 'Zero' | 'Carry' | 'Lookahead' | 'Average' | 'Nearest' | 'Linear';
  valueLabels?: 'hide' | 'show';
}

export interface XyLayer {
  layerId: string;
  layerType: 'data' | 'referenceLine' | 'annotations';
  seriesType?:
    | 'line'
    | 'area'
    | 'area_stacked'
    | 'area_percentage_stacked'
    | 'bar'
    | 'bar_horizontal'
    | 'bar_horizontal_stacked'
    | 'bar_horizontal_percentage_stacked'
    | 'bar_stacked'
    | 'bar_percentage_stacked';
  xAccessor?: string;
  accessors?: string[];
  splitAccessor?: string;
  /** Kibana 10.3 stores the split as an array. */
  splitAccessors?: string[];
  yConfig?: Array<{
    forAccessor: string;
    color?: string;
    axisMode?: 'left' | 'right' | 'auto';
  }>;
  curveType?: XyVisualizationState['curveType'];
  fittingFunction?: XyVisualizationState['fittingFunction'];
  valueLabels?: XyVisualizationState['valueLabels'];
}

export interface MetricVisualizationState {
  layerId: string;
  layerType?: 'data';
  metricAccessor?: string;
  secondaryMetricAccessor?: string;
  maxAccessor?: string;
  trendlineLayerId?: string;
  trendlineMetricAccessor?: string;
  color?: string;
  colorMode?: string;
  palette?: {
    params?: {
      stops?: Array<{ stop?: number; color?: string }>;
      reverse?: boolean;
    };
  };
  subtitle?: string;
  // Legacy metric uses `accessor` instead of `metricAccessor`.
  accessor?: string;
}

export interface PartitionVisualizationState {
  shape?: 'donut' | 'pie' | 'treemap' | 'mosaic' | 'waffle';
  layers: Array<PartitionLayer>;
  palette?: {
    params?: {
      colors?: string[];
      stops?: Array<{ stop?: number; color?: string }>;
    };
  };
  colorMapping?: unknown;
  /**
   * Lens's per-slice numeric label control. Older saved objects use
   * `'hidden'` / `'value'` / `'percent'`; newer Kibana surfaces narrow this
   * to the same three options. Adaptive UI maps these onto the donut
   * primitive's `valueDisplay` field directly, with the fallback `'both'`
   * matching Lens's pre-2022 default (value + percent in legend).
   */
  numberDisplay?: 'hidden' | 'value' | 'percent';
  /**
   * Whether the legend should include the per-slice numeric value alongside
   * the colour swatch. Newer Lens drives this with a dedicated toggle; we
   * read it but only consult it when `numberDisplay` is missing.
   */
  valuesInLegend?: boolean;
  labels?: {
    position?: 'default' | 'inside' | 'outside';
  };
}

export interface PartitionLayer {
  layerId: string;
  primaryGroups: string[];
  metric?: string;
  metrics?: string[];
}

// `lnsDatatable` carries columns plus an optional sort spec.
export interface DatatableVisualizationState {
  layerId: string;
  layerType?: 'data';
  columns?: Array<DatatableColumnConfig>;
  /**
   * Visible column ids in editor order. Newer Lens saved objects store this
   * beside `columns`; prefer it when present.
   */
  columnOrder?: string[];
  sorting?: { columnId?: string; direction?: 'asc' | 'desc' | 'none' };
  rowHeight?: string;
  paging?: { enabled?: boolean; size?: number };
}

export interface DatatableColumnConfig {
  columnId: string;
  /** The column's width in pixels, as the data grid sizes it. */
  width?: number;
  isTransposed?: boolean;
  alignment?: 'left' | 'right' | 'center';
  hidden?: boolean;
  customLabel?: string;
  font?: 'default' | 'monospace';
  summaryRow?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';
  summaryLabel?: string;
  /**
   * Where the column's palette should paint — Lens shapes this as
   * `'none' | 'cell' | 'text'`. Anything other than `none` opts the
   * column into heat coloring.
   */
  colorMode?: 'none' | 'cell' | 'text';
  /**
   * Optional palette config; the shape Kibana emits for sequential and
   * diverging palettes carries a `params.stops[]` array with
   * `{ stop?: number; color?: string }` entries. The converter preserves
   * the `color` strings when present and keeps a tone fallback for
   * low-capability renderers.
   */
  palette?: {
    name?: string;
    params?: {
      rangeType?: 'percent' | 'number';
      rangeMin?: number | null;
      rangeMax?: number | null;
      continuity?: 'above' | 'below' | 'all' | 'none';
      stops?: Array<{ stop?: number; color?: string }>;
      steps?: number;
      reverse?: boolean;
    };
  };
}

// `lnsGauge` represents a single value with a min/max range and optional
// banding. We only read the data fields the lowering needs; visual options
// (color, sub-shapes) are intentionally ignored.
export interface GaugeVisualizationState {
  layerId: string;
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
  shape?: 'horizontalBullet' | 'verticalBullet' | 'arc' | 'circle';
  ticksPosition?: string;
  colorMode?: string;
  palette?: { params?: { stops?: Array<{ stop?: number; color?: string }> } };
  min?: number;
  max?: number;
  goal?: number;
}

// `lnsHeatmap` is 2D — x-bucket × y-bucket × value. The binder degrades
// this to a 1D `heatmapStrip` with a diagnostic; renderers may add a true
// 2D heatmap primitive.
export interface HeatmapVisualizationState {
  layerId: string;
  xAccessor?: string;
  yAccessor?: string;
  valueAccessor?: string;
  shape?: 'heatmap';
  palette?: { params?: { stops?: Array<{ stop?: number; color?: string }> } };
}
