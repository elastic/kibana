/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { applyHouseStyle, type HouseStyleChange, type HouseStylePreserve } from '../house_style';
import type { ChartIntent } from '../intent';
import { isRecord } from '../is_record';
import { stripPanelLevelKeys } from '../panel_level';
import type { ProbedColumn } from '../probe_columns';
import {
  bindSlots,
  isBindOk,
  type BindAmbiguous,
  type BindError,
  type SlotBindings,
} from '../binder/bind_slots';
import { CHART_SCHEMAS } from './chart_schemas';
import { formatFromUnit, resolveColumnFormat } from './formats';

export type CompileMode = 'new' | 'edit';

export interface CompileConfigParams {
  chartType: SupportedChartType;
  query: string;
  columns: ProbedColumn[];
  mode: CompileMode;
  title?: string;
  intent?: ChartIntent;
  styleOverrides?: Record<string, unknown>;
  styleRequest?: string;
}

export interface CompileSuccess {
  config: Record<string, unknown>;
  panelLevel: { hide_title?: boolean };
  changes: HouseStyleChange[];
  bindings: SlotBindings;
}

export type CompileResult = CompileSuccess | BindAmbiguous | BindError;

const THRESHOLD_STEP_COLORS = ['#54b399', '#d6bf57', '#da8b45', '#e7664c'];

const formatZodError = (error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): string =>
  error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');

const deepMerge = (
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> => {
  const next = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const existing = next[key];
    if (isRecord(existing) && isRecord(value)) {
      next[key] = deepMerge(existing, value);
    } else {
      next[key] = value;
    }
  }
  return next;
};

const attachDataSource = (config: Record<string, unknown>, query: string): void => {
  const dataSource = { type: 'esql', query };
  if (Array.isArray(config.layers)) {
    for (const layer of config.layers) {
      if (isRecord(layer)) {
        layer.data_source = dataSource;
      }
    }
    return;
  }
  config.data_source = dataSource;
};

const applyFormat = (
  column: Record<string, unknown>,
  name: string,
  units?: ChartIntent['units']
): Record<string, unknown> => {
  const format = resolveColumnFormat(name, units);
  return format ? { ...column, format } : column;
};

const gaugeBands = (): Record<string, unknown> => ({
  color: {
    type: 'dynamic',
    range: 'percentage',
    steps: [
      { gte: 0, lt: 25, color: '#00bfb3' },
      { gte: 25, lt: 50, color: '#f1d86f' },
      { gte: 50, lt: 75, color: '#f5a700' },
      { gte: 75, lte: 100, color: '#e7664c' },
    ],
  },
});

const emitFromBindings = (
  bindings: SlotBindings,
  title: string | undefined
): Record<string, unknown> => {
  const titleFields = title ? { title } : {};

  switch (bindings.chartType) {
    case SupportedChartType.Metric:
      return {
        type: 'metric',
        ...titleFields,
        metrics: [
          applyFormat({ type: 'primary', column: bindings.primary }, bindings.primary ?? ''),
          ...(bindings.secondary
            ? [applyFormat({ type: 'secondary', column: bindings.secondary }, bindings.secondary)]
            : []),
        ],
        ...(bindings.breakdown ? { breakdown_by: { column: bindings.breakdown } } : {}),
      };
    case SupportedChartType.Gauge:
      return {
        type: 'gauge',
        ...titleFields,
        metric: {
          ...applyFormat({ column: bindings.primary ?? '' }, bindings.primary ?? ''),
          ...gaugeBands(),
          ...(bindings.gaugeMin ? { min: { column: bindings.gaugeMin } } : {}),
          ...(bindings.gaugeMax ? { max: { column: bindings.gaugeMax } } : {}),
          ...(bindings.gaugeGoal ? { goal: { column: bindings.gaugeGoal } } : {}),
        },
      };
    case SupportedChartType.XY:
      return {
        type: 'xy',
        ...titleFields,
        layers: [
          {
            type: bindings.layerType ?? 'line',
            ...(bindings.x ? { x: applyFormat({ column: bindings.x }, bindings.x) } : {}),
            y: (bindings.y ?? []).map((column) => applyFormat({ column }, column)),
            ...(bindings.breakdown ? { breakdown_by: { column: bindings.breakdown } } : {}),
          },
        ],
        ...(bindings.xScale ? { axis: { x: { scale: bindings.xScale } } } : {}),
      };
    case SupportedChartType.Heatmap:
      return {
        type: 'heatmap',
        ...titleFields,
        metric: applyFormat({ column: bindings.primary ?? '' }, bindings.primary ?? ''),
        x: applyFormat(
          { column: bindings.x ?? bindings.dimensions[0] ?? '' },
          bindings.x ?? bindings.dimensions[0] ?? ''
        ),
        ...(bindings.yDim ? { y: applyFormat({ column: bindings.yDim }, bindings.yDim) } : {}),
        ...(bindings.xScale ? { axis: { x: { scale: bindings.xScale } } } : {}),
      };
    case SupportedChartType.Tagcloud:
      return {
        type: 'tag_cloud',
        ...titleFields,
        metric: applyFormat({ column: bindings.primary ?? '' }, bindings.primary ?? ''),
        tag_by: { column: bindings.tagBy ?? '' },
      };
    case SupportedChartType.RegionMap:
      return {
        type: 'region_map',
        ...titleFields,
        metric: applyFormat({ column: bindings.primary ?? '' }, bindings.primary ?? ''),
        region: {
          column: bindings.region ?? '',
          ...(bindings.ems ? { ems: bindings.ems } : {}),
        },
      };
    case SupportedChartType.Datatable:
      return {
        type: 'data_table',
        ...titleFields,
        ...((bindings.metrics ?? []).length > 0
          ? {
              metrics: (bindings.metrics ?? []).map((column) => applyFormat({ column }, column)),
            }
          : {}),
        ...((bindings.rows ?? []).length > 0
          ? { rows: (bindings.rows ?? []).map((column) => applyFormat({ column }, column)) }
          : {}),
      };
    case SupportedChartType.Pie:
    case SupportedChartType.Treemap:
    case SupportedChartType.Waffle:
      return {
        type: bindings.chartType,
        ...titleFields,
        metrics: (bindings.metrics ?? []).map((column) => applyFormat({ column }, column)),
        ...(bindings.groupBy && bindings.groupBy.length > 0
          ? { group_by: bindings.groupBy.map((column) => ({ column })) }
          : {}),
      };
    case SupportedChartType.Mosaic:
      return {
        type: 'mosaic',
        ...titleFields,
        metric: applyFormat({ column: bindings.primary ?? '' }, bindings.primary ?? ''),
        group_by: (bindings.groupBy ?? []).map((column) => ({ column })),
        group_breakdown_by: (bindings.groupBreakdownBy ?? []).map((column) => ({ column })),
      };
    default: {
      const exhaustive: never = bindings.chartType;
      return { type: exhaustive };
    }
  }
};

const restoreColumn = (target: unknown, source: unknown): void => {
  if (isRecord(target) && isRecord(source) && typeof source.column === 'string') {
    target.column = source.column;
  }
};

const restoreColumnList = (target: unknown, source: unknown): void => {
  if (!Array.isArray(target) || !Array.isArray(source)) {
    return;
  }
  const limit = Math.min(target.length, source.length);
  for (let i = 0; i < limit; i++) {
    restoreColumn(target[i], source[i]);
  }
};

const restoreSlotColumns = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): void => {
  restoreColumn(target.metric, source.metric);
  restoreColumn(target.breakdown_by, source.breakdown_by);
  restoreColumn(target.tag_by, source.tag_by);
  restoreColumn(target.region, source.region);
  restoreColumn(target.x, source.x);
  restoreColumn(target.y, source.y);
  restoreColumnList(target.metrics, source.metrics);
  restoreColumnList(target.rows, source.rows);
  restoreColumnList(target.group_by, source.group_by);
  restoreColumnList(target.group_breakdown_by, source.group_breakdown_by);
  if (Array.isArray(target.layers) && Array.isArray(source.layers)) {
    const limit = Math.min(target.layers.length, source.layers.length);
    for (let i = 0; i < limit; i++) {
      if (isRecord(target.layers[i]) && isRecord(source.layers[i])) {
        restoreSlotColumns(target.layers[i], source.layers[i]);
      }
    }
  }
  if (isRecord(target.metric) && isRecord(source.metric)) {
    restoreColumn(target.metric.min, source.metric.min);
    restoreColumn(target.metric.max, source.metric.max);
    restoreColumn(target.metric.goal, source.metric.goal);
  }
};

const applyUnits = (
  config: Record<string, unknown>,
  units: NonNullable<ChartIntent['units']>
): void => {
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isRecord(value)) {
      return;
    }
    if (typeof value.column === 'string' && units[value.column]) {
      value.format = formatFromUnit(units[value.column]);
    }
    Object.values(value).forEach(visit);
  };
  visit(config);
};

const applyThresholdColor = (
  holder: Record<string, unknown>,
  intent: NonNullable<ChartIntent['thresholds']>
): void => {
  holder.color = {
    type: 'dynamic',
    range: intent.range ?? 'absolute',
    steps: intent.steps.map((value, index, all) => ({
      gte: value,
      ...(index < all.length - 1 ? { lt: all[index + 1] } : { lte: value }),
      color:
        THRESHOLD_STEP_COLORS[index] ?? THRESHOLD_STEP_COLORS[THRESHOLD_STEP_COLORS.length - 1],
    })),
  };
};

const applyIntent = (
  config: Record<string, unknown>,
  intent: ChartIntent | undefined
): Record<string, unknown> => {
  if (!intent) {
    return config;
  }
  const next = structuredClone(config);

  if (intent.units) {
    applyUnits(next, intent.units);
  }

  if (intent.legend_statistics && next.type === 'xy') {
    const legend = isRecord(next.legend) ? next.legend : {};
    next.legend = {
      ...legend,
      statistics: intent.legend_statistics,
      visibility: 'visible',
    };
  }

  if (next.type === 'metric' && Array.isArray(next.metrics)) {
    const metrics = next.metrics.filter(isRecord);
    if (intent.sparkline && metrics[0]) {
      metrics[0].background_chart = { type: 'trend' };
    }
    if (intent.secondary?.compare && metrics[1]) {
      metrics[1].compare = {
        to: intent.secondary.compare === 'previous' ? 'primary' : 'baseline',
      };
      const styling = isRecord(next.styling) ? next.styling : {};
      const secondary = isRecord(styling.secondary) ? styling.secondary : {};
      const label = isRecord(secondary.label) ? secondary.label : {};
      next.styling = {
        ...styling,
        secondary: { ...secondary, label: { ...label, visible: false } },
      };
    }
    if (intent.thresholds && metrics[0]) {
      applyThresholdColor(metrics[0], intent.thresholds);
    }
    next.metrics = metrics;
  }

  if (next.type === 'gauge' && isRecord(next.metric) && intent.thresholds) {
    applyThresholdColor(next.metric, intent.thresholds);
  }

  if (next.type === 'data_table') {
    const metrics = Array.isArray(next.metrics) ? next.metrics.filter(isRecord) : [];
    if (intent.table?.summary && metrics[0]) {
      metrics[0].summary = { type: intent.table.summary };
      next.metrics = metrics;
    }
    if (intent.table?.sort_by) {
      const rows = Array.isArray(next.rows) ? next.rows.filter(isRecord) : [];
      const metricIndex = metrics.findIndex((metric) => metric.column === intent.table?.sort_by);
      const rowIndex = rows.findIndex((row) => row.column === intent.table?.sort_by);
      if (metricIndex >= 0 || rowIndex >= 0) {
        const styling = isRecord(next.styling) ? next.styling : {};
        next.styling = {
          ...styling,
          sort_by: {
            column_type: metricIndex >= 0 ? 'metric' : 'row',
            index: metricIndex >= 0 ? metricIndex : rowIndex,
            direction: 'desc',
          },
        };
      }
    }
  }

  return next;
};

const applyStyled = (
  config: Record<string, unknown>,
  params: CompileConfigParams,
  rules: 'defects' | 'all'
) =>
  applyHouseStyle(config, {
    chartType: params.chartType,
    mode: params.mode === 'edit' ? 'edit' : 'new',
    rules,
    colors: 'keep',
    preserve: params.intent?.preserve as HouseStylePreserve[] | undefined,
  });

export const compileConfig = (params: CompileConfigParams): CompileResult => {
  const bound = bindSlots(params.chartType, params.query, params.columns, params.intent);
  if (!isBindOk(bound)) {
    return bound;
  }

  let config = emitFromBindings(bound.bindings, params.title);
  const firstStyle = applyStyled(config, params, params.mode === 'new' ? 'all' : 'defects');
  config = firstStyle.config;
  const changes = [...firstStyle.changes];
  let panelLevel = { ...firstStyle.panelLevel };

  config = applyIntent(config, params.intent);

  if (params.styleOverrides) {
    const beforeOverrides = structuredClone(config);
    config = deepMerge(config, params.styleOverrides);
    restoreSlotColumns(config, beforeOverrides);
  }

  if (params.mode === 'edit') {
    const defects = applyStyled(config, params, 'defects');
    config = defects.config;
    changes.push(...defects.changes);
    panelLevel = { ...panelLevel, ...defects.panelLevel };
  }

  attachDataSource(config, params.query);

  const stripped = stripPanelLevelKeys(config);
  const parsed = CHART_SCHEMAS[params.chartType].esql.safeParse(stripped.config);
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  if (typeof stripped.panelLevel.hide_title === 'boolean') {
    panelLevel = { ...panelLevel, hide_title: stripped.panelLevel.hide_title };
  }

  return {
    config: { ...stripped.config, ...panelLevel },
    panelLevel,
    changes,
    bindings: bound.bindings,
  };
};

export const isCompileSuccess = (result: CompileResult): result is CompileSuccess =>
  'config' in result && 'bindings' in result;
