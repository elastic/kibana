/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPalette } from '../../lens_palette';
import type { Tone } from './tone';

import type { AdaptiveQuery } from './adaptive_query';
import type { ValueFormatter } from './formatter';
import type { PalettePolicy } from './palette';
import type { ReductionPolicy } from './reductions';
import type { Reference } from './references';

// Field references inside a chart describe how columns from the query result
// map onto chart roles (series, slices, axes, metrics). The `id` is the
// column name as it will appear in the ES|QL result.

export interface SeriesRef {
  /**
   * Column name in the ES|QL result that carries this series' y-values.
   */
  id: string;
  label: string;
  tone?: Tone;
  /**
   * Optional CSS color override lifted from Lens's `yConfig[].color`. When
   * present, the bound primitive paints the series with this exact color
   * instead of resolving through `tone`. Accepts anything Lens stores —
   * hex, `rgb()`, named colors.
   */
  color?: string;
  axis?: 'left' | 'right';
  /**
   * Per-series chart kind override (mirrors Lens's mixed-mode XY where one
   * series renders as a bar while another renders as a line). Falls back to
   * `chart.mode` when unset.
   */
  kind?: 'line' | 'area' | 'bar';
  /**
   * Optional field whose unique values produced this series (for charts
   * that split a single metric across a categorical dimension).
   */
  splitOnField?: string;
}

export interface SliceRef {
  /**
   * Column name for the categorical label of each slice.
   */
  id: string;
  /**
   * Column name for the numeric size of each slice.
   */
  valueField: string;
  label: string;
}

export interface MetricRef {
  id: string;
  label: string;
  tone?: Tone;
  colorRules?: MetricColorRule[];
  /**
   * Formatter for this metric when it differs from the panel-level format
   * (e.g. a duration secondary beside a count primary).
   */
  format?: ValueFormatter;
}

export interface MetricColorRule {
  at: number;
  tone: Tone;
}

export interface TrendRef {
  /**
   * Column name that carries the trend series as an array of numbers, or
   * the time-bucketed data the binder will collapse into a sparkline.
   */
  id: string;
  label?: string;
  /**
   * Optional sibling query that returns the trend column over time. Lens
   * stores modern metric trendlines in a separate formBased layer; planning
   * emits this as an auxiliary query and binding merges it back into the
   * final `metricTrend` primitive.
   */
  query?: AdaptiveQuery;
}

/**
 * Per-column heat coloring lifted from Lens's `colorMode` + `palette`. The
 * binder computes the column's domain from the live data and the table
 * primitive picks a tone per cell based on each stop's normalized
 * position. `mode` corresponds to Lens's `colorMode`: `'cell'` tints the
 * cell background, `'text'` recolors the cell text only.
 */
export interface ColumnColorScale {
  mode: 'cell' | 'text';
  /**
   * Stops ordered by `at` in `[0, 1]`. The renderer picks the highest
   * stop whose `at` is `<= normalizedValue`.
   */
  stops: Array<{ at: number; tone: Tone; color?: string }>;
}

export interface ColumnRef {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  /** The column's width in pixels, as Lens's data grid sizes it. */
  width?: number;
  /** Lens's value coloring, resolved per cell at bind time as the data table paints it. */
  valueColor?: { mode: 'cell' | 'text'; palette: LensPalette };
  font?: 'default' | 'monospace';
  summary?: {
    function: 'sum' | 'avg' | 'min' | 'max' | 'count';
    label?: string;
  };
  /**
   * Optional formatter applied to numeric columns at bind time.
   */
  format?: ValueFormatter;
  /**
   * Optional heat-coloring hint. When set, the binder threads this through
   * to the table primitive which paints either the cell background or
   * text colour based on the value's position in the column's domain.
   */
  colorScale?: ColumnColorScale;
}

export interface SortRef {
  column: string;
  direction: 'asc' | 'desc';
}

export interface AxisRef {
  id: string;
  label: string;
}

export interface Band {
  end: number;
  tone?: Tone;
  color?: string;
  label?: string;
}

// The chart shape only — no rows. Renders to a `loading` placeholder until
// `bindViewPlan` swaps it for the bound primitive node.

export type AdaptiveChart =
  | AdaptiveXyChart
  | AdaptiveMetricChart
  | AdaptivePartitionChart
  | AdaptiveGaugeChart
  | AdaptiveDatatableChart
  | AdaptiveHeatmapChart;

export interface AdaptiveXyChart {
  kind: 'xy';
  /**
   * Default chart mode applied to series that omit `kind`.
   */
  mode: 'line' | 'area' | 'bar';
  stacked?: boolean;
  stack?: 'stacked' | 'percentage';
  /**
   * Bar-orientation hint. `'horizontal'` corresponds to Lens's
   * `bar_horizontal` / `bar_horizontal_stacked` series types — categories
   * read down the y-axis, values grow rightward. Honoured only for
   * `mode: 'bar'`; line / area always render vertically. Defaults to
   * `'vertical'`.
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Optional Lens line interpolation hint. Forwarded only to xyChart because
   * timeSeries does not expose curve selection today.
   */
  curve?: 'linear' | 'monotone' | 'step';
  /**
   * Lens missing bucket fitting hint. The primitive defaults to `zero`, so
   * this is only set when Lens authored a non-default strategy.
   */
  missingValues?: 'zero' | 'carry' | 'linear';
  /**
   * Lens value label visibility.
   */
  showValueLabels?: boolean;
  /**
   * When `false`, hide the series legend. Defaults to showing it.
   */
  showLegend?: boolean;
  /**
   * X axis column. Most often `@timestamp` for time series.
   */
  xAxis: AxisRef;
  /**
   * Primary y-axis label. Secondary axes are carried by `y2Axis` when Lens
   * assigns one or more series to the right axis.
   */
  yAxis: AxisRef;
  y2Axis?: AxisRef;
  series: SeriesRef[];
}

export interface AdaptiveMetricChart {
  kind: 'metric';
  primary: MetricRef;
  secondary?: MetricRef;
  /**
   * Optional maximum/range column. Lens metric panels use this to render
   * progress-style metrics; the bind step routes it to the bullet primitive
   * when the data table carries both value and max.
   */
  max?: MetricRef;
  /**
   * Optional trend column for a sparkline beneath the metric value.
   */
  trend?: TrendRef;
}

export interface AdaptivePartitionChart {
  kind: 'partition';
  /**
   * `donut`/`pie` render through the `donut` primitive's shape option;
   * `treemap`/`mosaic` onto `treemap`; `waffle` is a
   * degraded bar list with a diagnostic.
   */
  layout: 'donut' | 'pie' | 'treemap' | 'mosaic' | 'waffle';
  slices: SliceRef;
  /**
   * Exact palette colors from Lens, applied by slice/item index after the
   * binder sorts/reduces data. This preserves authored Elastic Charts colors
   * when Lens stores concrete hex values.
   */
  colors?: string[];
  /**
   * Exact category-to-color assignments lifted from Lens `colorMapping`.
   * Applied by slice label after data binding, so colors stay stable even
   * when sorting/reductions change the visible order.
   */
  colorMapping?: Record<string, string>;
  /**
   * Lifted from Lens's `numberDisplay` (with a fallback derived from
   * `valuesInLegend`). Drives the donut primitive's `valueDisplay` so the
   * legend can mirror what the Lens author configured — value, percent,
   * both, or hidden. Treemap binding ignores this field today; it lives on
   * the partition chart so we don't need a wider chart-options bag.
   */
  valueDisplay?: 'value' | 'percent' | 'both' | 'hidden';
  labelPosition?: 'legend' | 'inside' | 'outside' | 'none';
}

export interface AdaptiveGaugeChart {
  kind: 'gauge';
  value: MetricRef;
  shape?: 'arc' | 'horizontalBullet' | 'verticalBullet' | 'circle';
  range: { min: number; max: number };
  bands?: Band[];
  target?: number;
  unit?: string;
}

export interface AdaptiveDatatableChart {
  kind: 'datatable';
  density?: 'compact' | 'comfortable';
  columns: ColumnRef[];
  sort?: SortRef;
}

export interface AdaptiveHeatmapChart {
  kind: 'heatmap';
  xBucket: AxisRef;
  yBucket: AxisRef;
  value: MetricRef;
  colorStops?: ContinuousColorStop[];
}

export interface ContinuousColorStop {
  /**
   * Normalized stop position in [0, 1], where 0 is the heatmap domain min
   * and 1 is the domain max.
   */
  at: number;
  tone: Tone;
  color?: string;
}

export interface AdaptiveLensProvenance {
  /**
   * Human-readable source label, e.g. `"Kibana saved object lens/abc-123"`.
   */
  source: string;
  /**
   * Deep link back to the original view inside Kibana, when known.
   */
  kibanaUrl?: string;
  /**
   * Originating saved-object id. Useful for round-trip equality across
   * `from-*` adapters.
   */
  savedObjectId?: string;
  /**
   * Originating Lens visualization type, before lowering (e.g.
   * `lnsXY`, `lnsMetric`, `lnsPie`). Carried for diagnostics.
   */
  visualizationType?: string;
}

export interface AdaptiveLens {
  /**
   * Stable id; usually the source saved-object id, otherwise a deterministic
   * hash of the inputs.
   */
  id: string;
  title: string;
  subtitle?: string;
  chart: AdaptiveChart;
  query: AdaptiveQuery;
  format?: ValueFormatter;
  references?: Reference[];
  palette?: PalettePolicy;
  reductions?: ReductionPolicy;
  rendering?: PrimitiveRenderHints;
  provenance?: AdaptiveLensProvenance;
}

export interface PrimitiveRenderHints {
  /**
   * Draw point markers on line/area XY charts. This costs a few more bytes
   * and marks, so the converter only enables it for fuller fidelity profiles.
   */
  showPointMarkers?: boolean;
  /**
   * Surface a visible category/value legend for dense category charts whose
   * geometry alone cannot label every bucket.
   */
  showCategoryLegend?: boolean;
}
