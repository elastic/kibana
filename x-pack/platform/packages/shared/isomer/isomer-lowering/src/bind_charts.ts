/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Binds a planned dashboard to the Isomer charts pack (`@kbn/isomer-primitives-charts`): `xyChart`, `donut`,
// `treemap`, `heatmap`, `metricTrend`, and `gauge`. Nodes are plain JSON; the runtime that holds the pack
// validates them. A panel the spec cannot carry faithfully is refused, never drawn wrong; presentation goes to hints.

import { type EsqlResponse, type ExecuteEsql, tableCell } from './esql_response';
import type { Dimension, PlannedDashboard, PlannedPanel, TimeRange } from './dashboard';
import type {
  AdaptiveChart,
  AdaptiveDatatableChart,
  AdaptiveGaugeChart,
  AdaptiveHeatmapChart,
  AdaptiveMetricChart,
  AdaptivePartitionChart,
  AdaptiveXyChart,
} from './kibana/model/adaptive_lens';
import type { ValueFormatter } from './kibana/model/formatter';
import { bindAnnotations } from './lens_annotations';
import { bindNestedTreemap, isNestedTreemap } from './nested_treemap';
import { applyLensState, presentationHints } from './lens_presentation';

/** A predicate in the charts pack's selection contract. */
type Predicate =
  | { field: string; value: string | number | boolean }
  | { field: string; range: { gte: number | string; lt: number | string } };

export type ChartNode = { type: string } & Record<string, unknown>;

export type PanelOutcome =
  /** Bound to a pack node whose `id` is the panel id; what the spec leaves to the engine is in `hints`. */
  | { status: 'converted'; nodeType: string }
  /** The panel holds something no node can carry faithfully, so it gets no node rather than a wrong one. */
  | { status: 'refused'; nodeType: string; reasons: string[] }
  /** The Lens chart kind or layout maps to none of the six types. */
  | { status: 'outside'; reason: string }
  /** The query or binding failed. */
  | { status: 'failed'; reason: string }
  /** The query returned no rows, so no node could be built. */
  | { status: 'empty' };

export interface ChartPanelReport {
  panelId: string;
  title: string;
  chartKind: string;
  outcome: PanelOutcome;
  esql: string;
}

export interface ChartsDashboard {
  composition: { type: 'view'; title: string; body: ChartNode[] };
  panels: ChartPanelReport[];
  /** Presentation hints by node id; never part of the composition. */
  hints: Record<string, Record<string, unknown>>;
}

/** What binding found: reasons to refuse the panel, and hints for the engine. */
interface Binding {
  refuse: string[];
  hint: Record<string, unknown>;
}

const SELECT = 'dashboard/select';

const MISSING = '(missing)';

const keyOfValue = (value: unknown): string =>
  value === null || value === undefined ? MISSING : value === '' ? '(empty)' : String(value);

const columnIndex = ({ columns }: EsqlResponse, name: string): number => {
  const index = columns.findIndex((column) => column.name === name);
  if (index < 0) {
    throw new Error(
      `column ${name} is not in the response (${columns.map((c) => c.name).join(', ')})`
    );
  }
  return index;
};

const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Lens's formatter as the pack's `format`, and what of it the pack cannot carry. */
const toFormat = (
  format: ValueFormatter | undefined,
  { refuse }: Binding
): Record<string, unknown> | undefined => {
  if (!format) {
    return undefined;
  }
  const { kind, precision, optionalDecimals, compact, prefix, suffix, unit, template } = format;
  if (template) {
    refuse.push(`format template ${template}`);
  }
  // The pack prints up to two decimals for a number and one otherwise, as `0,0.[00]` does in Lens.
  const packMaximum = kind === 'percent' || kind === 'bytes' || kind === 'duration' ? 1 : 2;
  if (optionalDecimals && precision !== undefined && precision !== packMaximum) {
    refuse.push(`up to ${precision} optional decimals, where the pack prints up to ${packMaximum}`);
  }
  const digits = precision === undefined || optionalDecimals ? {} : { precision };
  const affixes = { ...(prefix ? { prefix } : {}), ...(suffix ? { suffix } : {}) };
  switch (kind) {
    case 'percent':
      return { style: 'percent', ...digits, ...affixes };
    case 'bytes':
      return { style: 'bytes', ...digits, ...affixes };
    case 'duration':
      return { style: 'duration', ...digits, ...affixes };
    case 'custom':
      refuse.push('custom format');
      return undefined;
    default:
      return {
        style: 'number',
        ...digits,
        ...(compact ? { compact: true } : {}),
        ...(unit ? { suffix: unit } : {}),
        ...affixes,
      };
  }
};

const withFormat = (
  format: ValueFormatter | undefined,
  binding: Binding
): { format?: Record<string, unknown> } => {
  const mapped = toFormat(format, binding);
  return mapped ? { format: mapped } : {};
};

const GRANULARITY_STEPS: Array<[number, string]> = [
  [365 * 86_400_000, 'year'],
  [28 * 86_400_000, 'month'],
  [86_400_000, 'day'],
  [3_600_000, 'hour'],
  [60_000, 'minute'],
];

const INTERVAL_UNITS: Array<[number, string]> = [
  [604_800_000, 'week'],
  [86_400_000, 'day'],
  [3_600_000, 'hour'],
  [60_000, 'minute'],
  [1_000, 'second'],
  [1, 'millisecond'],
];

/** A bucket width in milliseconds as the largest unit it is a whole number of. */
const intervalOf = (intervalMs: number) => {
  const [ms, unit] = INTERVAL_UNITS.find(([size]) => intervalMs % size === 0)!;
  return { value: intervalMs / ms, unit };
};

const granularityOf = (intervalMs: number): string =>
  GRANULARITY_STEPS.find(([ms]) => intervalMs >= ms)?.[1] ?? 'second';

const termPredicates = (dimension: Dimension | undefined, raw: unknown): Predicate[] =>
  dimension?.kind === 'terms' &&
  (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean')
    ? [{ field: dimension.field, value: raw }]
    : [];

const bucketPredicates = (dimension: Dimension | undefined, key: string): Predicate[] => {
  if (dimension?.kind === 'date_histogram') {
    return [
      {
        field: dimension.field,
        range: { gte: key, lt: new Date(Date.parse(key) + dimension.intervalMs).toISOString() },
      },
    ];
  }
  if (dimension?.kind === 'histogram') {
    const gte = Number(key);
    return Number.isFinite(gte)
      ? [{ field: dimension.field, range: { gte, lt: gte + dimension.width } }]
      : [];
  }
  return [];
};

const selectionFor = (panelId: string, on: Record<string, Record<string, Predicate[]>>) => {
  const bound = Object.fromEntries(
    Object.entries(on)
      .map(
        ([dimension, byKey]) =>
          [
            dimension,
            Object.fromEntries(Object.entries(byKey).filter(([, p]) => p.length > 0)),
          ] as const
      )
      .filter(([, byKey]) => Object.keys(byKey).length > 0)
  );
  return {
    name: SELECT,
    context: { panelId },
    ...(Object.keys(bound).length > 0 ? { on: bound } : {}),
  };
};

const heading = (title: string) => (title ? { title } : {});

const bindXy = (
  panel: PlannedPanel,
  chart: AdaptiveXyChart,
  response: EsqlResponse,
  title: string,
  binding: Binding,
  window: TimeRange | undefined
): ChartNode => {
  const xIndex = columnIndex(response, chart.xAxis.id);
  const xDimension = panel.dimensions[chart.xAxis.id];
  const split = chart.series[0]?.splitOnField;
  const splitIndex = split === undefined ? undefined : columnIndex(response, split);

  const isTime = xDimension?.kind === 'date_histogram';
  const isNumber = !isTime && xDimension?.kind === 'histogram';
  const xOf = (raw: unknown): string | number =>
    isNumber ? Number(raw) : isTime ? new Date(String(raw)).toISOString() : keyOfValue(raw);
  const width = isNumber ? (xDimension as { width: number }).width : undefined;
  if (width && response.values.some((row) => Number(row[xIndex]) % width !== 0)) {
    binding.refuse.push(`x values that do not start bins ${width} wide`);
  }

  const hasRight = chart.series.some(({ axis }) => axis === 'right');
  interface Series {
    key: string;
    label: string;
    kind?: string;
    axis?: string;
    points: Array<{ x: string | number; y: number | null }>;
    raw: unknown;
  }
  const series: Series[] = [];
  if (splitIndex !== undefined) {
    const yIndex = columnIndex(response, chart.series[0]!.id);
    const bySplit = new Map<string, Series>();
    for (const row of response.values) {
      const key = keyOfValue(row[splitIndex]);
      const entry = bySplit.get(key) ?? { key, label: key, points: [], raw: row[splitIndex] };
      entry.points.push({ x: xOf(row[xIndex]), y: numberOrNull(row[yIndex]) });
      bySplit.set(key, entry);
    }
    series.push(...bySplit.values());
    if (chart.series.length > 1) {
      binding.refuse.push(`series beyond the first with a split (${chart.series.length - 1})`);
    }
  } else {
    for (const ref of chart.series) {
      const yIndex = columnIndex(response, ref.id);
      series.push({
        key: ref.id,
        label: ref.label || ref.id,
        ...(ref.kind && ref.kind !== chart.mode ? { kind: ref.kind } : {}),
        ...(ref.axis === 'right' ? { axis: 'y2' } : {}),
        points: response.values.map((row) => ({
          x: xOf(row[xIndex]),
          y: numberOrNull(row[yIndex]),
        })),
        raw: undefined,
      });
    }
  }

  const kindOf = (kind: string | undefined) => kind ?? chart.mode;
  const categories =
    isTime || isNumber ? [] : [...new Set(response.values.map((row) => keyOfValue(row[xIndex])))];
  const horizontal = chart.orientation === 'horizontal';
  const canHorizontal =
    horizontal && !isTime && !isNumber && series.every(({ kind }) => kindOf(kind) === 'bar');
  if (horizontal && !canHorizontal) {
    binding.refuse.push('horizontal orientation on a time or numeric x');
  }

  const xKeys = [...new Set(series.flatMap(({ points }) => points.map(({ x }) => String(x))))];
  const node: ChartNode = {
    type: 'xyChart',
    ...heading(title),
    x: isTime
      ? {
          type: 'time',
          ...(chart.xAxis.label ? { title: chart.xAxis.label } : {}),
          granularity: granularityOf((xDimension as { intervalMs: number }).intervalMs),
          interval: intervalOf((xDimension as { intervalMs: number }).intervalMs),
          ...(window ? { domain: { from: window.from, to: window.to } } : {}),
        }
      : isNumber
      ? {
          type: 'number',
          ...(chart.xAxis.label ? { title: chart.xAxis.label } : {}),
          interval: (xDimension as { width: number }).width,
        }
      : { type: 'category', ...(chart.xAxis.label ? { title: chart.xAxis.label } : {}) },
    y: {
      ...(chart.yAxis.label ? { title: chart.yAxis.label } : {}),
      ...withFormat(panel.query.format, binding),
    },
    ...(hasRight && splitIndex === undefined
      ? { y2: { ...(chart.y2Axis?.label ? { title: chart.y2Axis.label } : {}) } }
      : {}),
    series: series.map(({ key, label, kind, axis, points }) => ({
      ...(key !== label ? { key } : {}),
      label,
      kind: kindOf(kind),
      ...(axis ? { axis } : {}),
      points,
    })),
    ...(chart.stack === 'percentage'
      ? { stack: 'percent' }
      : chart.stacked
      ? { stack: 'stacked' }
      : {}),
    ...(chart.missingValues ? { missing: chart.missingValues } : {}),
    ...(canHorizontal ? { orientation: 'horizontal' } : {}),
    selection: selectionFor(panel.panelId, {
      x: Object.fromEntries(
        (isTime || isNumber ? xKeys : categories).map((key) => [
          key,
          isTime || isNumber
            ? bucketPredicates(xDimension, key)
            : termPredicates(xDimension, key === MISSING ? null : key),
        ])
      ),
      ...(splitIndex === undefined
        ? {}
        : {
            series: Object.fromEntries(
              series.map(({ key, raw }) => [key, termPredicates(panel.dimensions[split!], raw)])
            ),
          }),
    }),
  };
  return node;
};

const bindMetric = async (
  panel: PlannedPanel,
  chart: AdaptiveMetricChart,
  response: EsqlResponse,
  title: string,
  binding: Binding,
  trend: EsqlResponse | undefined
): Promise<ChartNode> => {
  const value = numberOrNull(response.values[0]?.[columnIndex(response, chart.primary.id)]);
  const name = title || chart.primary.label;
  if (chart.secondary) {
    binding.refuse.push(`secondary metric ${chart.secondary.label}`);
  }
  if (chart.primary.colorRules?.length) {
    binding.refuse.push(`color by value (${chart.primary.colorRules.length} rules)`);
  }
  if (chart.max) {
    const max = numberOrNull(response.values[0]?.[columnIndex(response, chart.max.id)]);
    if (max !== null && max > 0) {
      return {
        type: 'gauge',
        title: name,
        value,
        domain: { min: 0, max },
        shape: 'bar',
        ...withFormat(panel.query.format, binding),
        selection: { name: SELECT, context: { panelId: panel.panelId } },
      };
    }
    binding.refuse.push('a max with no positive value');
  }
  const points =
    trend && trend.columns.length >= 2
      ? trend.values
          .map((row) => ({
            x: String(row[trend.columns.findIndex(({ type }) => type === 'date')] ?? ''),
            y: numberOrNull(row[trend.columns.findIndex(({ type }) => type !== 'date')]),
          }))
          .filter(({ x }) => x !== '' && !Number.isNaN(Date.parse(x)))
          .map(({ x, y }) => ({ x: new Date(x).toISOString(), y }))
      : [];
  return {
    type: 'metricTrend',
    title: name,
    value,
    ...withFormat(panel.query.format, binding),
    ...(points.length >= 2 ? { trend: { points } } : {}),
    selection: { name: SELECT, context: { panelId: panel.panelId } },
  };
};

const bindPartition = (
  panel: PlannedPanel,
  chart: AdaptivePartitionChart,
  response: EsqlResponse,
  title: string,
  binding: Binding
): ChartNode => {
  const sliceIndex = columnIndex(response, chart.slices.id);
  const valueIndex = columnIndex(response, chart.slices.valueField);
  const dimension = panel.dimensions[chart.slices.id];
  const rows = response.values.map((row) => ({
    key: keyOfValue(row[sliceIndex]),
    raw: row[sliceIndex],
    value: Math.max(0, numberOrNull(row[valueIndex]) ?? 0),
  }));
  const formatted = withFormat(panel.query.format, binding);
  if (chart.layout === 'treemap' || chart.layout === 'mosaic') {
    if (chart.layout === 'mosaic') {
      binding.refuse.push('mosaic layout');
    }
    return {
      type: 'treemap',
      ...heading(title),
      items: rows.map(({ key, value }) => ({ label: key, value })),
      ...formatted,
      selection: selectionFor(panel.panelId, {
        path: Object.fromEntries(rows.map(({ key, raw }) => [key, termPredicates(dimension, raw)])),
      }),
    };
  }
  return {
    type: 'donut',
    ...heading(title),
    parts: rows.map(({ key, value }) => ({ label: key, value })),
    ...formatted,
    selection: selectionFor(panel.panelId, {
      slice: Object.fromEntries(rows.map(({ key, raw }) => [key, termPredicates(dimension, raw)])),
    }),
  };
};

const bindHeatmap = (
  panel: PlannedPanel,
  chart: AdaptiveHeatmapChart,
  response: EsqlResponse,
  title: string,
  binding: Binding,
  window: TimeRange | undefined
): ChartNode => {
  const xIndex = columnIndex(response, chart.xBucket.id);
  const valueIndex = columnIndex(response, chart.value.id);
  const yIndex = response.columns.findIndex(({ name }) => name === chart.yBucket.id);
  const xDimension = panel.dimensions[chart.xBucket.id];
  const isTime = xDimension?.kind === 'date_histogram';
  if (chart.colorStops?.length) {
    binding.refuse.push(`color stops (${chart.colorStops.length})`);
  }
  const xOf = (raw: unknown) => (isTime ? new Date(String(raw)).toISOString() : keyOfValue(raw));
  return {
    type: 'heatmap',
    ...heading(title),
    x: isTime
      ? {
          type: 'time',
          ...(chart.xBucket.label ? { title: chart.xBucket.label } : {}),
          granularity: granularityOf((xDimension as { intervalMs: number }).intervalMs),
          interval: intervalOf((xDimension as { intervalMs: number }).intervalMs),
          ...(window ? { domain: { from: window.from, to: window.to } } : {}),
        }
      : { type: 'category', ...(chart.xBucket.label ? { title: chart.xBucket.label } : {}) },
    ...(yIndex >= 0
      ? { y: { type: 'category', ...(chart.yBucket.label ? { title: chart.yBucket.label } : {}) } }
      : {}),
    cells: response.values.map((row) => ({
      x: xOf(row[xIndex]),
      ...(yIndex >= 0 ? { y: keyOfValue(row[yIndex]) } : {}),
      value: numberOrNull(row[valueIndex]),
    })),
    ...withFormat(panel.query.format, binding),
  };
};

const bindGauge = (
  panel: PlannedPanel,
  chart: AdaptiveGaugeChart,
  response: EsqlResponse,
  title: string,
  binding: Binding
): ChartNode => {
  const value = numberOrNull(response.values[0]?.[columnIndex(response, chart.value.id)]);
  const bands = (chart.bands ?? []).filter(({ tone }) => tone);
  if ((chart.bands ?? []).some(({ color, tone }) => color && !tone)) {
    binding.refuse.push('band colors without a tone');
  }
  if (chart.shape === 'circle') {
    binding.hint.shape = 'circle';
  }
  return {
    type: 'gauge',
    title: title || chart.value.label,
    value,
    domain: { min: chart.range.min, max: chart.range.max },
    ...(chart.target === undefined ? {} : { target: chart.target }),
    ...(bands.length > 0
      ? {
          bands: bands.map(({ end, tone, label }) => ({
            to: end,
            tone,
            ...(label ? { label } : {}),
          })),
        }
      : {}),
    shape: chart.shape === 'horizontalBullet' || chart.shape === 'verticalBullet' ? 'bar' : 'arc',
    ...withFormat(panel.query.format, binding),
    selection: { name: SELECT, context: { panelId: panel.panelId } },
  };
};

const OUTSIDE: Record<string, string> = {};

// The components pack's `table`: 20 columns, 1,000 rows, 10,000 cells, 500 characters a cell.
const TABLE_MAX_COLUMNS = 20;
const TABLE_MAX_CELLS = 10_000;
const TABLE_MAX_ROWS = 1000;
const TABLE_MAX_CELL = 500;

/** A Lens data table as the components pack's `table`: cells formatted as Lens shows them, in Lens's sort. */
const bindDatatable = (chart: AdaptiveDatatableChart, response: EsqlResponse): ChartNode => {
  const columns = chart.columns.slice(0, TABLE_MAX_COLUMNS);
  const indices = columns.map(({ id }) => columnIndex(response, id));
  const cap = Math.min(TABLE_MAX_ROWS, Math.floor(TABLE_MAX_CELLS / Math.max(1, columns.length)));
  const rows = response.values.slice(0, cap).map((row) =>
    columns.map(({ format }, index) => {
      const cell = tableCell(row[indices[index]!], format);
      return typeof cell === 'string' ? cell.slice(0, TABLE_MAX_CELL) || null : cell;
    })
  );
  const sortColumn = chart.sort ? columns.findIndex(({ id }) => id === chart.sort!.column) : -1;
  return {
    type: 'table',
    columns: columns.map(({ label, align, format }) => ({
      label: label.slice(0, 100),
      ...(align ? { align } : format ? { align: 'right' } : {}),
    })),
    rows,
    ...(response.values.length > rows.length ? { totalRows: response.values.length } : {}),
    ...(sortColumn >= 0 ? { sort: { column: sortColumn, direction: chart.sort!.direction } } : {}),
  };
};

/** Executes each panel's query and binds it to one of the six chart types, reporting every panel. */
export const bindChartsDashboard = async (
  planned: PlannedDashboard,
  executeEsql: ExecuteEsql
): Promise<ChartsDashboard> => {
  const trendQueries = new Map<string, string>();
  for (const panel of planned.panels) {
    const trendId = panel.binding.auxiliaryQueryIds?.trend;
    if (trendId) {
      trendQueries.set(panel.panelId, trendId);
    }
  }
  const panels = await Promise.all(
    planned.panels.map(
      async (
        panel
      ): Promise<{
        report: ChartPanelReport;
        node?: ChartNode;
        hints?: Record<string, unknown>;
      }> => {
        const chart = panel.query.chart as AdaptiveChart;
        const title = panel.query.label ?? '';
        const { esql } = panel.query.query;
        const report = (outcome: PanelOutcome): ChartPanelReport => ({
          panelId: panel.panelId,
          title,
          chartKind: chart.kind,
          outcome,
          esql,
        });
        const ownRange = planned.unresolvedPanelTimeRanges[panel.panelId];
        if (ownRange) {
          return {
            report: report({
              status: 'refused',
              nodeType: chart.kind,
              reasons: [`panel time range ${ownRange.from} to ${ownRange.to} has no ES|QL window`],
            }),
          };
        }
        if (OUTSIDE[chart.kind]) {
          return { report: report({ status: 'outside', reason: OUTSIDE[chart.kind]! }) };
        }
        if (chart.kind === 'partition' && chart.layout === 'waffle') {
          return { report: report({ status: 'outside', reason: 'waffle layout' }) };
        }
        try {
          const response = await executeEsql(esql);
          if (response.values.length === 0 && chart.kind !== 'datatable') {
            return { report: report({ status: 'empty' }) };
          }
          const binding: Binding = { refuse: [], hint: {} };
          let colorRank: string[] | undefined;
          let node: ChartNode;
          switch (chart.kind) {
            case 'xy':
              node = bindXy(
                panel,
                chart,
                response,
                title,
                binding,
                panel.timeRange ?? planned.timeRange
              );
              break;
            case 'metric': {
              const trendId = trendQueries.get(panel.panelId);
              const trendQuery = trendId
                ? (panel.auxiliaryEsql ?? planned.auxiliaryEsql)[trendId]
                : undefined;
              node = await bindMetric(
                panel,
                chart,
                response,
                title,
                binding,
                trendQuery ? await executeEsql(trendQuery) : undefined
              );
              break;
            }
            case 'partition': {
              if (isNestedTreemap(panel.lens)) {
                const nested = await bindNestedTreemap(panel, title, executeEsql);
                binding.refuse.push(...nested.refusals);
                colorRank = nested.colorRank;
                node = nested.node ?? { type: 'treemap' };
                break;
              }
              node = bindPartition(panel, chart, response, title, binding);
              break;
            }
            case 'heatmap':
              node = bindHeatmap(
                panel,
                chart,
                response,
                title,
                binding,
                panel.timeRange ?? planned.timeRange
              );
              break;
            case 'gauge':
              node = bindGauge(panel, chart, response, title, binding);
              break;
            case 'datatable':
              node = bindDatatable(chart, response);
              break;
            default:
              return {
                report: report({
                  status: 'outside',
                  reason: `chart kind ${(chart as { kind: string }).kind}`,
                }),
              };
          }
          if (node.type === 'table') {
            // A table past its column cap still draws its first columns, which beats a placeholder.
            return {
              report: report({ status: 'converted', nodeType: 'table' }),
              node: { id: panel.panelId, ...node },
            };
          }
          const reasons = [...binding.refuse, ...applyLensState(panel.lens, node)];
          const window = panel.timeRange ?? planned.timeRange;
          const {
            annotations,
            hints: annotationHints,
            refusals,
          } = await bindAnnotations(panel.lens, node, { window, esql, executeEsql });
          reasons.push(...refusals);
          if (annotations.length > 0) {
            node.annotations = annotations;
          }
          Object.assign(binding.hint, annotationHints);
          if (reasons.length > 0) {
            return { report: report({ status: 'refused', nodeType: node.type, reasons }) };
          }
          return {
            report: report({ status: 'converted', nodeType: node.type }),
            node: { id: panel.panelId, ...node },
            hints: {
              ...presentationHints(panel.lens, node, { ...panel, colorRank }),
              ...binding.hint,
            },
          };
        } catch (error) {
          return {
            report: report({
              status: 'failed',
              reason: error instanceof Error ? error.message : String(error),
            }),
          };
        }
      }
    )
  );
  return {
    composition: {
      type: 'view',
      title: planned.title,
      body: panels.flatMap(({ node }) => (node ? [node] : [])),
    },
    panels: panels.map(({ report }) => report),
    hints: Object.fromEntries(
      panels.flatMap(({ node, hints }) => (node && hints ? [[node.id as string, hints]] : []))
    ),
  };
};
