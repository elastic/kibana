/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColorCategories } from '@kbn/chart-expressions-common';
import { getResolvedAnnotationColor } from '@kbn/event-annotation-common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { ChartData, Loss, XyChartNode } from '@kbn/isomer';
import { KbnPalette } from '@kbn/palettes';
import type { MaterializeLoss, MaterializedNode } from '../nodes';
import type { ConcreteColor } from '../kit/colors';
import { toHexColor } from '../kit/colors';
import type { ChartColumnRole } from '../kit/types';
import type { MaterializeKit } from '../types';
import { collapseTable } from './collapse';
import { toColorMappingConfig } from './color_mapping';
import { applyLensFormats, toLensFieldFormat } from './formats';
import { isXyDataLayer, isXyEsqlReferenceLinesLayer, xyQueryLayers } from './plan';
import {
  bucketInterval,
  collectColumns,
  findColumn,
  fixedColor,
  lensLink,
  toChartGlyph,
} from './shared';
import type {
  LensSavedObjectReference,
  LensXyAnnotationsLayer,
  LensXyConfig,
  LensXyDataLayer,
  LensXyEsqlReferenceLinesLayer,
  LensXyLayer,
} from './types';

type NodeLayer = XyChartNode['layers'][number];
type NodeDataLayer = Extract<NodeLayer, { kind: 'data' }>;
type NodeReferenceLine = Extract<NodeLayer, { kind: 'referenceLines' }>['lines'][number];
type NodeAnnotation = Extract<NodeLayer, { kind: 'annotations' }>['events'][number];
type NodeAxes = NonNullable<XyChartNode['axes']>;
type NodeLegend = NonNullable<XyChartNode['legend']>;
type NodeStyle = NonNullable<XyChartNode['style']>;
type ApiAxis = NonNullable<NonNullable<LensXyConfig['axis']>['x' | 'y' | 'y2']>;

/** A data layer with the columns it reads in the merged `data`, after any renames. */
interface MappedDataLayer {
  layer: LensXyDataLayer;
  index: number;
  table: Datatable;
  ids: Record<string, string>;
  rows: [number, number];
  /** The split column's values in the order Lens meets them, when the layer splits. */
  categories: unknown[];
}

const MARKS: Record<
  LensXyDataLayer['type'],
  { mark: NodeDataLayer['mark']; stack?: NodeDataLayer['stack']; horizontal?: true }
> = {
  area: { mark: 'area' },
  area_stacked: { mark: 'area', stack: 'stacked' },
  area_percentage: { mark: 'area', stack: 'percentage' },
  bar: { mark: 'bar' },
  bar_stacked: { mark: 'bar', stack: 'stacked' },
  bar_percentage: { mark: 'bar', stack: 'percentage' },
  bar_horizontal: { mark: 'bar', horizontal: true },
  bar_horizontal_stacked: { mark: 'bar', stack: 'stacked', horizontal: true },
  bar_horizontal_percentage: { mark: 'bar', stack: 'percentage', horizontal: true },
  line: { mark: 'line' },
};

/** Lens's default palette for a layer's series type: line charts get the line-optimized one. */
const defaultPalette = (type: LensXyDataLayer['type']): string =>
  type === 'line' ? KbnPalette.ElasticLineOptimized : KbnPalette.Default;

/** A split cell as a series key: its string form, `null` as "null". */
const splitKey = (value: unknown): string => (value === null ? 'null' : String(value));

/**
 * Appends each layer's chart data in layer order. Layers share one x column, as Isomer requires
 * (elastic/isomer#372): a later layer's x column of the same type joins the first layer's. Any
 * other column whose id an earlier layer already used is renamed, so every column keeps the one
 * source table it came from.
 */
const mergeLayerData = (
  parts: Array<{ data: ChartData; losses: Loss[]; x?: string }>
): {
  data: ChartData;
  losses: Loss[];
  ids: Array<Record<string, string>>;
  ranges: Array<[number, number]>;
} => {
  if (parts.length === 1) {
    const [{ data, losses }] = parts;
    const ids = Object.fromEntries(data.columns.map(({ id }) => [id, id]));
    return { data, losses, ids: [ids], ranges: [[0, data.rows.length]] };
  }
  const columns: ChartData['columns'] = [];
  const rows: ChartData['rows'] = [];
  const display: Record<string, string[]> = {};
  const losses: Loss[] = [];
  const ids: Array<Record<string, string>> = [];
  const ranges: Array<[number, number]> = [];
  const taken = new Set<string>();
  let sharedX: number | undefined;
  parts.forEach(({ data, losses: partLosses, x }, partIndex) => {
    const start = rows.length;
    const renamed: Record<string, string> = {};
    const targets = data.columns.map((column) => {
      if (column.id === x && sharedX !== undefined && columns[sharedX].type === column.type) {
        renamed[column.id] = columns[sharedX].id;
        return sharedX;
      }
      let id = column.id;
      for (let attempt = 2; taken.has(id); attempt++) {
        id = `${column.id} (${partIndex + 1}${attempt > 2 ? `.${attempt - 1}` : ''})`;
      }
      taken.add(id);
      renamed[column.id] = id;
      columns.push({ ...column, id });
      if (column.id === x && sharedX === undefined) {
        sharedX = columns.length - 1;
      }
      return columns.length - 1;
    });
    ids.push(renamed);
    for (const row of data.rows) {
      const merged: ChartData['rows'][number] = new Array(columns.length).fill(null);
      row.forEach((cell, index) => {
        merged[targets[index]] = cell;
      });
      rows.push(merged);
    }
    for (const [id, strings] of Object.entries(data.display ?? {})) {
      const target = renamed[id];
      const existing = display[target] ?? [];
      display[target] = [...existing, ...new Array(start - existing.length).fill(''), ...strings];
    }
    losses.push(
      ...partLosses.map((loss) => ({
        ...loss,
        path: loss.path.replace(
          /^data\.columns\[(\d+)\]/,
          (_, index) => `data.columns[${targets[Number(index)]}]`
        ),
      }))
    );
    ranges.push([start, rows.length]);
  });
  const width = columns.length;
  return {
    data: {
      columns,
      rows: rows.map((row) => [...row, ...new Array(width - row.length).fill(null)]),
      ...(Object.keys(display).length > 0
        ? {
            display: Object.fromEntries(
              Object.entries(display).map(([id, strings]) => [
                id,
                [...strings, ...new Array(rows.length - strings.length).fill('')],
              ])
            ),
          }
        : {}),
      ...(parts[0].data.missing ? { missing: parts[0].data.missing } : {}),
    },
    losses,
    ids,
    ranges,
  };
};

/**
 * Each series' color as Lens's xy chart picks it. Layers without a split color their series by
 * rank in a palette shared by every layer with the same palette; layers with a split color each
 * split value through the layer's color mapping.
 */
const seriesColors = (
  layers: MappedDataLayer[],
  kit: MaterializeKit
): { yColors: Map<string, ConcreteColor>; byKey: Record<string, ConcreteColor> } => {
  const yColors = new Map<string, ConcreteColor>();
  const byKey: Record<string, ConcreteColor> = {};

  const paletteOf = ({ layer }: MappedDataLayer) => {
    const color = layer.breakdown_by?.color;
    const mapping = color ? toColorMappingConfig(color) : undefined;
    return mapping && 'legacyPalette' in mapping
      ? mapping.legacyPalette
      : color?.palette ?? defaultPalette(layer.type);
  };
  const groups = new Map<string, MappedDataLayer[]>();
  for (const mapped of layers) {
    const palette = mapped.layer.breakdown_by
      ? paletteOf(mapped)
      : defaultPalette(mapped.layer.type);
    groups.set(palette, [...(groups.get(palette) ?? []), mapped]);
  }

  for (const [palette, group] of groups) {
    const counts = group.map(
      ({ layer, categories }) =>
        (layer.breakdown_by ? Math.max(categories.length, 1) : 1) * layer.y.length
    );
    const total = counts.reduce((sum, count) => sum + count, 0);
    const colors = kit.paletteColors(total, palette);
    group.forEach((mapped, groupIndex) => {
      const { layer, categories, ids } = mapped;
      const offset = counts.slice(0, groupIndex).reduce((sum, count) => sum + count, 0);
      if (!layer.breakdown_by) {
        layer.y.forEach((_, yIndex) => {
          yColors.set(`${mapped.index}:${yIndex}`, colors[offset + yIndex]);
        });
        return;
      }
      const prefix = (column: string) => (layer.y.length > 1 ? `${ids[column]}:` : '');
      const mapping = toColorMappingConfig(
        layer.breakdown_by.color ?? {
          mode: 'categorical',
          palette: defaultPalette(layer.type),
          mapping: [],
        }
      );
      const categoryColors =
        'config' in mapping
          ? kit.colorMappingColors(categories, mapping.config)
          : categories.map((_, rank) => colors[(offset + rank * layer.y.length) % colors.length]);
      categories.forEach((category, rank) => {
        for (const { column } of layer.y) {
          byKey[`${prefix(column)}${splitKey(category)}`] = categoryColors[rank];
        }
      });
    });
  }
  return { yColors, byKey };
};

const axisOf = (
  axis: ApiAxis | undefined,
  defaultTitle: string | undefined
): NodeAxes['x'] & NodeAxes['y'] => {
  const title = axis?.title?.visible === false ? undefined : axis?.title?.text ?? defaultTitle;
  return {
    ...(title ? { title } : {}),
    ...(axis?.ticks ? { ticks: axis.ticks.visible } : {}),
    ...(axis?.grid ? { grid: axis.grid.visible } : {}),
    ...(axis?.labels?.orientation ? { labelOrientation: axis.labels.orientation } : {}),
  };
};

const yAxisOf = (
  axis: NonNullable<LensXyConfig['axis']>['y'],
  defaultTitle: string | undefined
): NodeAxes['y'] => {
  const domain = axis?.domain;
  return {
    ...axisOf(axis, defaultTitle),
    ...(axis?.scale ? { scale: axis.scale } : {}),
    ...(domain
      ? {
          domain:
            domain.type === 'custom'
              ? { kind: 'custom' as const, min: domain.min, max: domain.max }
              : { kind: domain.type },
          ...(domain.rounding !== undefined ? { rounding: domain.rounding } : {}),
        }
      : {}),
  };
};

const legendOf = (legend: LensXyConfig['legend']): NodeLegend | undefined => {
  if (!legend) {
    return undefined;
  }
  const inside = legend.placement === 'inside';
  const layout = legend.layout;
  const truncate = layout?.type === 'grid' ? layout.truncate : undefined;
  const result: NodeLegend = {
    ...(legend.visibility ? { visibility: legend.visibility } : {}),
    ...(inside
      ? { inside: legend.position ?? 'top_right' }
      : legend.position
      ? { position: legend.position as NodeLegend['position'] }
      : {}),
    ...(layout ? { layout: layout.type } : {}),
    ...('columns' in legend && legend.columns ? { columns: legend.columns } : {}),
    ...(truncate && truncate.enabled !== false && truncate.max_lines
      ? { maxLines: truncate.max_lines }
      : {}),
    ...('size' in legend && legend.size ? { size: legend.size } : {}),
    ...(legend.statistics?.length ? { statistics: legend.statistics } : {}),
    ...(legend.series_header?.visible && legend.series_header.text
      ? { seriesHeader: legend.series_header.text }
      : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
};

const styleOf = (styling: LensXyConfig['styling'], kit: MaterializeKit): NodeStyle | undefined => {
  if (!styling) {
    return undefined;
  }
  const { timeRange } = kit.context;
  const style: NodeStyle = {
    ...(styling.interpolation ? { interpolation: styling.interpolation } : {}),
    ...(styling.fitting
      ? {
          fitting: {
            kind: styling.fitting.type,
            ...(styling.fitting.emphasize !== undefined
              ? { emphasize: styling.fitting.emphasize }
              : {}),
            ...(styling.fitting.extend ? { extend: styling.fitting.extend } : {}),
          },
        }
      : {}),
    ...(styling.points?.visibility ? { points: styling.points.visibility } : {}),
    ...(styling.areas?.fill_opacity !== undefined
      ? { areaOpacity: styling.areas.fill_opacity }
      : {}),
    ...(styling.areas?.fill ? { areaFill: styling.areas.fill } : {}),
    ...(styling.bars?.minimum_height !== undefined
      ? { barMinimumHeight: styling.bars.minimum_height }
      : {}),
    ...(styling.bars?.data_labels ? { barValueLabels: styling.bars.data_labels.visible } : {}),
    ...(styling.overlays?.partial_buckets?.visible && timeRange
      ? { partialBuckets: { from: timeRange.from, to: timeRange.to } }
      : {}),
    ...(styling.overlays?.current_time_marker?.visible
      ? { currentTime: new Date().toISOString() }
      : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};

const toTime = (value: number | string): number =>
  typeof value === 'number' ? value : Date.parse(value);

const annotationsOf = (
  layer: LensXyAnnotationsLayer
): Extract<NodeLayer, { kind: 'annotations' }> => ({
  kind: 'annotations',
  events: layer.events.map((event): NodeAnnotation => {
    const configured = event.color?.type === 'static' ? event.color.color : undefined;
    const isRange = event.type === 'range';
    const color = {
      light: toHexColor(getResolvedAnnotationColor({ color: configured, isRange })),
      dark: toHexColor(
        getResolvedAnnotationColor({ color: configured, isRange, isDarkMode: true })
      ),
    };
    const hidden = event.visible === false ? { hidden: true } : {};
    if (event.type === 'range') {
      return {
        kind: 'range',
        from: toTime(event.interval.from),
        to: toTime(event.interval.to),
        ...(event.label ? { label: event.label } : {}),
        color,
        ...(event.fill ? { fill: event.fill } : {}),
        ...hidden,
      };
    }
    return {
      kind: 'point',
      at: toTime(event.timestamp),
      ...(event.label ? { label: event.label } : {}),
      ...(event.text?.visible && event.label ? { text: event.label } : {}),
      color,
      ...(toChartGlyph(event.icon) ? { icon: toChartGlyph(event.icon) } : {}),
      ...(event.line
        ? { line: { width: event.line.stroke_width, dash: event.line.stroke_dash } }
        : {}),
      ...hidden,
    };
  }),
});

type Threshold =
  | LensXyEsqlReferenceLinesLayer['thresholds'][number]
  | Extract<LensXyLayer, { type: 'reference_lines' }>['thresholds'][number];

const referenceLinesOf = (
  layer: Extract<LensXyLayer, { type: 'reference_lines' }>,
  table: Datatable | undefined,
  layerIndex: number,
  kit: MaterializeKit,
  losses: MaterializeLoss[]
): Extract<NodeLayer, { kind: 'referenceLines' }> | undefined => {
  const lines = (layer.thresholds as Threshold[]).flatMap(
    (threshold, index): NodeReferenceLine[] => {
      let value: unknown;
      let fieldFormat = threshold.format ? toLensFieldFormat(threshold.format) : undefined;
      let label = threshold.label;
      if ('column' in threshold) {
        const column = table ? findColumn(table, threshold.column) : undefined;
        value = table?.rows[0]?.[threshold.column];
        fieldFormat ??= column?.meta.params;
        label ??= column?.name;
      } else if ('value' in threshold) {
        value = threshold.value;
      }
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        losses.push({
          path: `layers[${layerIndex}].thresholds[${index}]`,
          kind: 'dropped',
          note: i18n.translate('xpack.isomer.materialize.lens.referenceLineValue', {
            defaultMessage: 'The reference line has no numeric value to draw.',
          }),
        });
        return [];
      }
      const mapping = fieldFormat ? kit.toPortableFormat(fieldFormat, 'number') : undefined;
      if (mapping?.prerender || mapping?.dropped) {
        losses.push({
          path: `layers[${layerIndex}].thresholds[${index}].format`,
          kind: 'approximated',
          note: mapping.prerender ?? mapping.dropped ?? '',
        });
      }
      return [
        {
          value,
          ...(threshold.axis ? { axis: threshold.axis } : {}),
          ...(label ? { label } : {}),
          ...(mapping?.format ? { format: mapping.format } : {}),
          ...(threshold.text ? { showText: threshold.text.visible } : {}),
          ...(threshold.color?.type === 'static'
            ? { color: fixedColor(threshold.color.color) }
            : {}),
          ...(threshold.fill ? { fill: threshold.fill } : {}),
          ...(toChartGlyph(threshold.icon) ? { icon: toChartGlyph(threshold.icon) } : {}),
          ...(threshold.stroke_width ? { strokeWidth: threshold.stroke_width } : {}),
          ...(threshold.stroke_dash ? { strokeDash: threshold.stroke_dash } : {}),
          ...(threshold.position ? { textPosition: threshold.position } : {}),
        },
      ];
    }
  );
  return lines.length > 0 ? { kind: 'referenceLines', lines } : undefined;
};

/** A Lens ES|QL xy chart and its layers' tables, as an `xyChart` node. */
export const mapLensXy = (
  chart: LensXyConfig,
  tables: Datatable[],
  kit: MaterializeKit,
  savedObject?: LensSavedObjectReference
): MaterializedNode => {
  const losses: MaterializeLoss[] = [];
  const layers = chart.layers as LensXyLayer[];
  const queryLayers = xyQueryLayers(chart);
  const tableOf = new Map(queryLayers.map((layer, index) => [layer, tables[index]]));

  const dataLayers = layers.filter(isXyDataLayer);
  const parts = dataLayers.map((layer) => {
    const index = layers.indexOf(layer);
    let table = tableOf.get(layer);
    if (!table) {
      throw new Error(`Layer ${index} has no table.`);
    }
    const breakdown = layer.breakdown_by;
    if (breakdown?.collapse_by) {
      table = collapseTable(
        table,
        layer.x ? [layer.x.column] : [],
        layer.y.map(({ column }) => column),
        breakdown.collapse_by
      );
    }
    const split = breakdown && !breakdown.collapse_by ? breakdown : undefined;
    const { labels, formats } = collectColumns([layer.x, split, ...layer.y]);
    const roles: Record<string, ChartColumnRole> = {};
    for (const { column } of layer.y) {
      roles[column] = 'metric';
    }
    for (const ref of [layer.x, split]) {
      if (ref) {
        findColumn(table, ref.column);
        roles[ref.column] = 'dimension';
      }
    }
    for (const { column } of layer.y) {
      findColumn(table, column);
    }
    const { data, losses: dataLosses } = kit.toChartData(applyLensFormats(table, formats), {
      roles,
      labels,
    });
    return {
      layer,
      index,
      table,
      split,
      part: { data, losses: dataLosses, x: layer.x?.column },
    };
  });

  const merged = mergeLayerData(parts.map(({ part }) => part));
  losses.push(...merged.losses);
  const mapped: MappedDataLayer[] = parts.map(({ layer, index, table, split }, partIndex) => ({
    layer: split ? layer : { ...layer, breakdown_by: undefined },
    index,
    table,
    ids: merged.ids[partIndex],
    rows: merged.ranges[partIndex],
    categories: split ? (getColorCategories(table.rows, [split.column]) as unknown[]) : [],
  }));
  const { yColors, byKey } = seriesColors(mapped, kit);

  const horizontal = mapped.every(({ layer }) => MARKS[layer.type].horizontal);
  const multiple = mapped.length > 1;
  const nodeLayers: NodeLayer[] = [];
  for (const layer of layers) {
    const index = layers.indexOf(layer);
    const data = mapped.find((candidate) => candidate.layer === layer || candidate.index === index);
    if (data) {
      const { layer: dataLayer, ids, rows } = data;
      const { mark, stack } = MARKS[dataLayer.type];
      if (MARKS[dataLayer.type].horizontal && !horizontal) {
        losses.push({
          path: `layers[${index}].type`,
          kind: 'approximated',
          note: i18n.translate('xpack.isomer.materialize.lens.mixedOrientation', {
            defaultMessage: 'Kibana draws horizontal bars only when every layer is horizontal.',
          }),
        });
      }
      nodeLayers.push({
        kind: 'data',
        mark,
        ...(stack ? { stack } : {}),
        ...(dataLayer.x ? { x: ids[dataLayer.x.column] } : {}),
        y: dataLayer.y.map(({ column, axis, color }, yIndex) => {
          const seriesColor =
            !dataLayer.breakdown_by && color?.type === 'static'
              ? fixedColor(color.color)
              : yColors.get(`${index}:${yIndex}`);
          return {
            column: ids[column],
            ...(axis && axis !== 'y' ? { axis } : {}),
            ...(seriesColor ? { color: seriesColor } : {}),
          };
        }),
        ...(dataLayer.breakdown_by ? { splitBy: ids[dataLayer.breakdown_by.column] } : {}),
        ...(multiple ? { rows } : {}),
      });
      if (dataLayer.sampling !== undefined && dataLayer.sampling < 1) {
        losses.push({
          path: `layers[${index}].sampling`,
          kind: 'dropped',
          note: i18n.translate('xpack.isomer.materialize.lens.sampling', {
            defaultMessage: 'ES|QL charts do not sample, so the sampling setting has no effect.',
          }),
        });
      }
      continue;
    }
    if (layer.type === 'reference_lines') {
      const lines = referenceLinesOf(
        layer,
        isXyEsqlReferenceLinesLayer(layer) ? tableOf.get(layer) : undefined,
        index,
        kit,
        losses
      );
      if (lines) {
        nodeLayers.push(lines);
      }
      continue;
    }
    if (layer.type === 'annotations') {
      nodeLayers.push(annotationsOf(layer));
    }
  }

  const first = mapped[0];
  const xColumn = first?.layer.x ? findColumn(first.table, first.layer.x.column) : undefined;
  const xLabel = first?.layer.x ? first.layer.x.label ?? xColumn?.name : undefined;
  const yTitle = (axis: 'y' | 'y2') => {
    for (const { layer, table } of mapped) {
      const series = layer.y.find((y) => (y.axis ?? 'y') === axis);
      if (series) {
        return series.label ?? findColumn(table, series.column).name;
      }
    }
    return undefined;
  };
  const usesY2 = mapped.some(({ layer }) => layer.y.some(({ axis }) => axis === 'y2'));
  // Lens draws the x axis on the scale its column's type implies (`getScaleType`); the API's
  // `axis.x.scale` only describes it. Without an x column, the configured scale stands.
  const xScale = xColumn
    ? xColumn.meta.type === 'date'
      ? 'temporal'
      : xColumn.meta.type === 'number'
      ? 'linear'
      : 'ordinal'
    : chart.axis?.x?.scale;
  const xDomain = chart.axis?.x?.domain;
  const xInterval = xScale === 'ordinal' ? undefined : bucketInterval(xColumn);
  const axes: NodeAxes = {
    x: {
      ...axisOf(chart.axis?.x, xLabel),
      ...(xScale ? { scale: xScale } : {}),
      ...(xInterval ? { interval: xInterval } : {}),
      ...(xDomain
        ? {
            domain:
              xDomain.type === 'custom'
                ? { kind: 'custom' as const, min: xDomain.min, max: xDomain.max }
                : { kind: 'fit' as const },
            ...(xDomain.rounding !== undefined ? { rounding: xDomain.rounding } : {}),
          }
        : {}),
    },
    y: yAxisOf(chart.axis?.y, yTitle('y')),
    ...(usesY2 || chart.axis?.y2 ? { y2: yAxisOf(chart.axis?.y2, yTitle('y2')) } : {}),
  };

  const splits = mapped.some(({ layer }) => layer.breakdown_by);
  const dimensions = merged.data.columns.some(({ role }) => role === 'dimension');
  const brushColumn =
    xColumn?.meta.type === 'date' && first?.layer.x ? first.ids[first.layer.x.column] : undefined;
  const link = lensLink(savedObject, kit.context);
  const interactions: NonNullable<XyChartNode['interactions']> = {
    ...(dimensions
      ? {
          select: splits
            ? ['datum' as const, 'series' as const, 'legend' as const]
            : ['datum' as const],
        }
      : {}),
    ...(brushColumn ? { brush: { column: brushColumn } } : {}),
    ...(link ? { link } : {}),
  };

  const legend = legendOf(chart.legend);
  const style = styleOf(chart.styling, kit);
  const { data } = merged;
  if (parts.length > 1) {
    losses.push({
      path: 'data.source',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.multipleTables', {
        defaultMessage:
          'Each data layer runs its own query, so the node keeps each column’s source but no single table source.',
      }),
    });
  }

  const node: XyChartNode = {
    type: 'xyChart',
    ...(chart.title ? { title: chart.title } : {}),
    ...(chart.description ? { description: chart.description } : {}),
    data,
    ...(Object.keys(byKey).length > 0 ? { colors: { byKey } } : {}),
    ...(horizontal ? { orientation: 'horizontal' as const } : {}),
    layers: nodeLayers,
    axes,
    ...(legend ? { legend } : {}),
    ...(style ? { style } : {}),
    ...(Object.keys(interactions).length > 0 ? { interactions } : {}),
    ...(losses.length > 0 ? { losses } : {}),
  };
  return node;
};
