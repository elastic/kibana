/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { HeatmapNode } from '@kbn/isomer';
import { LENS_HEATMAP_DEFAULT_COLOR_STEPS } from '@kbn/lens-common';
import type { MaterializeLoss, MaterializedNode } from '../nodes';
import type { MaterializeKit } from '../types';
import type { ChartColumnRole } from '../kit/types';
import { applyLensFormats } from './formats';
import { collectColumns, findColumn, lensLink } from './shared';
import { dateMinInterval } from './time_domain';
import type { LensHeatmapConfig, LensSavedObjectReference } from './types';
import { isColorByValue, toValueBands } from './value_colors';

type Axes = NonNullable<HeatmapNode['axes']>;
type Legend = NonNullable<HeatmapNode['legend']>;
type ApiAxis = NonNullable<NonNullable<LensHeatmapConfig['axis']>['x' | 'y']>;

/**
 * An axis title as Lens's API transform sets it: hidden unless `title.visible` (Lens's
 * `isXAxisTitleVisible` and `isYAxisTitleVisible` default to false), its text or the column's label.
 */
const axisTitle = (axis: ApiAxis | undefined, label: string): string | undefined =>
  axis?.title?.visible ? axis.title.text ?? label : undefined;

const axesOf = (
  chart: LensHeatmapConfig,
  labels: { x: string; y?: string }
): HeatmapNode['axes'] => {
  const { x, y } = chart.axis ?? {};
  const xTitle = axisTitle(x, labels.x);
  const yTitle = labels.y !== undefined ? axisTitle(y, labels.y) : undefined;
  const axes: Axes = {};
  const xAxis: NonNullable<Axes['x']> = {
    ...(xTitle ? { title: xTitle } : {}),
    ...(x?.labels?.visible === false ? { labels: false } : {}),
    ...(x?.labels?.orientation && x.labels.orientation !== 'horizontal'
      ? { labelOrientation: x.labels.orientation }
      : {}),
  };
  const yAxis: NonNullable<Axes['y']> = {
    ...(yTitle ? { title: yTitle } : {}),
    ...(y?.labels?.visible === false ? { labels: false } : {}),
  };
  if (Object.keys(xAxis).length > 0) {
    axes.x = xAxis;
  }
  if (Object.keys(yAxis).length > 0) {
    axes.y = yAxis;
  }
  return Object.keys(axes).length > 0 ? axes : undefined;
};

const legendOf = (legend: LensHeatmapConfig['legend']): Legend | undefined => {
  const result: Legend = {
    ...(legend?.visibility ? { visibility: legend.visibility } : {}),
    ...(legend?.position && legend.position !== 'right' ? { position: legend.position } : {}),
    ...(legend?.truncate_after_lines ? { maxLines: legend.truncate_after_lines } : {}),
    ...(legend?.size ? { size: legend.size } : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
};

/** The table's rows, without any that repeat an earlier row's x and y cells. */
const uniqueCells = (
  table: Datatable,
  x: string,
  y: string | undefined,
  losses: MaterializeLoss[]
): Datatable => {
  const seen = new Set<string>();
  const rows = table.rows.filter((row) => {
    const key = JSON.stringify([row[x] ?? null, y ? row[y] ?? null : null]);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  if (rows.length < table.rows.length) {
    losses.push({
      path: 'data.rows',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.heatmapRepeatedCells', {
        defaultMessage: '{count} rows repeat an earlier cell; each cell keeps its first row.',
        values: { count: table.rows.length - rows.length },
      }),
    });
  }
  return rows.length < table.rows.length ? { ...table, rows } : table;
};

/** A Lens ES|QL heat map and its query's table, as a `heatmap` node. */
export const mapLensHeatmap = (
  chart: LensHeatmapConfig,
  [queried]: Datatable[],
  kit: MaterializeKit,
  savedObject?: LensSavedObjectReference
): MaterializedNode => {
  if (!queried) {
    throw new Error('A heat map needs its table.');
  }
  const losses: MaterializeLoss[] = [];
  const { x, y, metric } = chart;
  const refs = [x, ...(y ? [y] : []), metric];
  const table = uniqueCells(
    {
      ...queried,
      columns: refs.map(({ column }) => findColumn(queried, column)),
    },
    x.column,
    y?.column,
    losses
  );
  if (y && table.rows.some((row) => row[y.column] === null || row[y.column] === undefined)) {
    losses.push({
      path: 'y.column',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.heatmapMissingY', {
        defaultMessage:
          'Kibana draws rows whose y value is missing in a row of their own; they are not drawn here.',
      }),
    });
  }
  const { labels, formats } = collectColumns(refs);
  const roles: Record<string, ChartColumnRole> = {
    [x.column]: 'dimension',
    ...(y ? { [y.column]: 'dimension' } : {}),
    [metric.column]: 'metric',
  };
  const { data, losses: dataLosses } = kit.toChartData(applyLensFormats(table, formats), {
    roles,
    labels,
  });
  losses.push(...dataLosses);

  const xColumn = findColumn(table, x.column);
  const isTime = xColumn.meta.type === 'date';
  // Lens's heat map buckets a time axis by the x column's date histogram interval.
  const interval = isTime ? dateMinInterval(xColumn) : undefined;
  const label = (id: string) =>
    data.columns.find((column) => column.id === id)?.label ?? findColumn(table, id).name;

  // Lens's default, `temperature` in 5 steps over the values (`LENS_HEATMAP_DEFAULT_PALETTE_PARAMS`),
  // is the node's own default, so only a configured palette states bands.
  const color = isColorByValue(metric.color) ? metric.color : undefined;
  const bands = color
    ? toValueBands(color, {
        path: 'metric.color',
        kit,
        losses,
        steps: LENS_HEATMAP_DEFAULT_COLOR_STEPS,
      })
    : undefined;

  const axes = axesOf(chart, { x: label(x.column), ...(y ? { y: label(y.column) } : {}) });
  const legend = legendOf(chart.legend);
  const link = lensLink(savedObject, kit.context);
  const interactions: NonNullable<HeatmapNode['interactions']> = {
    select: ['cell'],
    ...(isTime ? { brush: { column: x.column } } : {}),
    ...(link ? { link } : {}),
  };

  const node: HeatmapNode = {
    type: 'heatmap',
    ...(chart.title ? { title: chart.title } : {}),
    ...(chart.description ? { description: chart.description } : {}),
    data,
    ...(bands ? { colors: { bands: bands.bands } } : {}),
    x: {
      column: x.column,
      ...(chart.axis?.x?.sort ? { sort: chart.axis.x.sort } : {}),
      ...(interval ? { interval } : {}),
    },
    ...(y
      ? { y: { column: y.column, ...(chart.axis?.y?.sort ? { sort: chart.axis.y.sort } : {}) } }
      : {}),
    value: { column: metric.column },
    ...(bands && bands.range === 'percentage' ? { bandsRange: 'percentage' as const } : {}),
    ...(chart.styling?.cells?.labels?.visible ? { cellLabels: true } : {}),
    ...(axes ? { axes } : {}),
    ...(legend ? { legend } : {}),
    interactions,
    ...(losses.length > 0 ? { losses } : {}),
  };
  return node;
};
