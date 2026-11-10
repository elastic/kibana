/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { DataTableColumn, DataTableNode } from '@kbn/isomer';
import { DEFAULT_HEADER_ROW_HEIGHT_LINES, DEFAULT_ROW_HEIGHT_LINES } from '@kbn/lens-common';
import type { MaterializeLoss, MaterializedNode } from '../nodes';
import type { MaterializeKit } from '../types';
import { createUnsupportedNode } from '../unsupported';
import type { ChartColumnRole } from '../kit/types';
import { collapseTable } from './collapse';
import { categoryColorsByKey } from './color_mapping';
import { applyLensFormats } from './formats';
import { collectColumns, findColumn, lensLink } from './shared';
import type { LensDatatableConfig, LensSavedObjectReference } from './types';
import {
  isColorByValue,
  isColorMapping,
  numberBounds,
  toAbsoluteBands,
  toValueBands,
} from './value_colors';

type Row = NonNullable<LensDatatableConfig['rows']>[number];
type Metric = NonNullable<LensDatatableConfig['metrics']>[number];
type Decoration = NonNullable<DataTableColumn['decoration']>;
type SummaryKind = NonNullable<Metric['summary']>['type'];

/** Lens's `apply_color_to` targets, as the decorations that draw them (`colorModeCompat`). */
const DECORATIONS: Record<NonNullable<Metric['apply_color_to']>, Decoration['kind']> = {
  value: 'text',
  background: 'background',
  badge: 'badge',
};

/** Lens's default summary labels (`getSummaryRowOptions` in Lens's datatable summary). */
const summaryLabel = (kind: SummaryKind): string => {
  switch (kind) {
    case 'sum':
      return i18n.translate('xpack.isomer.materialize.lens.summary.sum', {
        defaultMessage: 'Sum',
      });
    case 'avg':
      return i18n.translate('xpack.isomer.materialize.lens.summary.avg', {
        defaultMessage: 'Average',
      });
    case 'count':
      return i18n.translate('xpack.isomer.materialize.lens.summary.count', {
        defaultMessage: 'Value count',
      });
    case 'min':
      return i18n.translate('xpack.isomer.materialize.lens.summary.min', {
        defaultMessage: 'Minimum',
      });
    case 'max':
      return i18n.translate('xpack.isomer.materialize.lens.summary.max', {
        defaultMessage: 'Maximum',
      });
  }
};

interface ShownColumn {
  ref: Row | Metric;
  path: string;
  isMetric: boolean;
}

/**
 * Lens's `lens_collapse` for each collapsed row, in row order: the metrics folded over the rows
 * that share every other row column still in the table, as Lens's datatable expression chains them.
 */
const collapseRows = (table: Datatable, rows: Row[], metrics: Metric[]): Datatable => {
  let collapsed = table;
  const remaining = rows.map(({ column }) => column);
  for (const row of rows) {
    if (!row.collapse_by) {
      continue;
    }
    remaining.splice(remaining.indexOf(row.column), 1);
    collapsed = collapseTable(
      collapsed,
      remaining,
      metrics.map(({ column }) => column),
      row.collapse_by
    );
  }
  return collapsed;
};

/**
 * A column's cell decoration, as Lens's datatable colors its cells. Lens colors a column only
 * with an `apply_color_to`. A numeric column is colored by value: its steps, its named palette, or
 * Lens's default palette spread over the column's values (`getColorDefaults`). Any other column is
 * colored by term through its color mapping, or Lens's default one.
 */
const decorationOf = (
  { ref, path }: ShownColumn,
  table: Datatable,
  kit: MaterializeKit,
  losses: MaterializeLoss[]
): Decoration | undefined => {
  if (!ref.apply_color_to) {
    return undefined;
  }
  const kind = DECORATIONS[ref.apply_color_to];
  const isNumber = findColumn(table, ref.column).meta.type === 'number';
  const color = ref.color;
  if (isNumber) {
    const values = table.rows.map((row) => row[ref.column]);
    const bounds = numberBounds(values) ?? { min: 0, max: 0 };
    const bands = toValueBands(isColorByValue(color) ? color : undefined, {
      path: `${path}.color`,
      kit,
      losses,
    });
    return { kind, colors: { bands: toAbsoluteBands(bands, bounds) } };
  }
  if (isColorByValue(color)) {
    losses.push({
      path: `${path}.color`,
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.datatableTermsByValue', {
        defaultMessage:
          'The column is not numeric, so Kibana colors it by term with its default colors.',
      }),
    });
  }
  const byKey = categoryColorsByKey(
    table.rows,
    [ref.column],
    isColorMapping(color) ? color : undefined,
    kit,
    { exclude: [null] }
  );
  return { kind, colors: { byKey } };
};

const densityLosses = (
  density: NonNullable<LensDatatableConfig['styling']>['density'],
  losses: MaterializeLoss[]
) => {
  const { header, value } = density?.height ?? {};
  if (value && (value.type === 'auto' || value.lines !== DEFAULT_ROW_HEIGHT_LINES)) {
    losses.push({
      path: 'styling.density.height.value',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.datatableRowHeight', {
        defaultMessage: 'Rows are one line high, not the row height Kibana sets.',
      }),
    });
  }
  if (header && (header.type === 'auto' || header.max_lines !== DEFAULT_HEADER_ROW_HEIGHT_LINES)) {
    losses.push({
      path: 'styling.density.height.header',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.datatableHeaderHeight', {
        defaultMessage: 'Headers wrap as the table draws them, not at the lines Kibana sets.',
      }),
    });
  }
};

/** A Lens ES|QL data table and its query's table, as a `dataTable` node. */
export const mapLensDatatable = (
  chart: LensDatatableConfig,
  [queried]: Datatable[],
  kit: MaterializeKit,
  savedObject?: LensSavedObjectReference
): MaterializedNode => {
  if (!queried) {
    throw new Error('A data table needs its table.');
  }
  if (chart.split_metrics_by?.length) {
    return createUnsupportedNode(
      i18n.translate('xpack.isomer.materialize.lens.datatableSplitMetrics', {
        defaultMessage:
          'Data tables that split their metrics into columns cannot be materialized yet.',
      })
    );
  }
  const losses: MaterializeLoss[] = [];
  const rows = chart.rows ?? [];
  const metrics = chart.metrics ?? [];
  for (const { column } of [...rows, ...metrics]) {
    findColumn(queried, column);
  }
  const table = collapseRows(queried, rows, metrics);

  // Lens orders its columns rows first, then metrics (the API transform's `columnOrder`).
  const shown: ShownColumn[] = [
    ...rows.flatMap((ref, index) =>
      ref.collapse_by ? [] : [{ ref, path: `rows[${index}]`, isMetric: false }]
    ),
    ...metrics.map((ref, index) => ({ ref, path: `metrics[${index}]`, isMetric: true })),
  ];
  const seen = new Set<string>();
  const unique = shown.filter(({ ref, path }) => {
    if (seen.has(ref.column)) {
      losses.push({
        path: `${path}.column`,
        kind: 'dropped',
        note: i18n.translate('xpack.isomer.materialize.lens.datatableRepeatedColumn', {
          defaultMessage: 'The column "{column}" is shown once.',
          values: { column: ref.column },
        }),
      });
      return false;
    }
    seen.add(ref.column);
    return true;
  });

  const { labels, formats } = collectColumns(unique.map(({ ref }) => ref));
  const roles: Record<string, ChartColumnRole> = Object.fromEntries(
    unique.map(({ ref, isMetric }) => [ref.column, isMetric ? 'metric' : 'dimension'])
  );
  const ordered: Datatable = {
    ...table,
    columns: unique.map(({ ref }) => findColumn(table, ref.column)),
  };
  const { data, losses: dataLosses } = kit.toChartData(applyLensFormats(ordered, formats), {
    roles,
    labels,
  });
  losses.push(...dataLosses);

  const columns: DataTableColumn[] = unique.flatMap((entry) => {
    const { ref, isMetric } = entry;
    if (ref.visible === false) {
      return [];
    }
    const isNumber = findColumn(table, ref.column).meta.type === 'number';
    const decoration = decorationOf(entry, table, kit, losses);
    const summary = isMetric && isNumber ? (ref as Metric).summary : undefined;
    return [
      {
        column: ref.column,
        ...(ref.alignment ? { alignment: ref.alignment } : {}),
        ...(ref.width ? { width: ref.width } : {}),
        ...(decoration ? { decoration } : {}),
        ...(summary
          ? { summary: { kind: summary.type, label: summary.label ?? summaryLabel(summary.type) } }
          : {}),
      },
    ];
  });
  if (columns.length === 0) {
    return createUnsupportedNode(
      i18n.translate('xpack.isomer.materialize.lens.datatableHidden', {
        defaultMessage: 'Every column of the data table is hidden.',
      })
    );
  }

  const { styling } = chart;
  densityLosses(styling?.density, losses);
  if (styling?.row_numbers?.visible) {
    losses.push({
      path: 'styling.row_numbers',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.datatableRowNumbers', {
        defaultMessage: 'Row numbers are not shown.',
      }),
    });
  }
  const sortBy = styling?.sort_by;
  const sortRef =
    sortBy?.column_type === 'row'
      ? rows[sortBy.index]
      : sortBy?.column_type === 'metric'
      ? metrics[sortBy.index]
      : undefined;
  const sortColumn =
    sortRef && !('collapse_by' in sortRef && sortRef.collapse_by) ? sortRef.column : undefined;
  const density = styling?.density?.mode;
  const dimensions = columns.some(({ column }) => roles[column] === 'dimension');
  const link = lensLink(savedObject, kit.context);
  const interactions: NonNullable<DataTableNode['interactions']> = {
    ...(dimensions ? { select: ['cell' as const] } : {}),
    ...(link ? { link } : {}),
    ...(sortBy && sortColumn
      ? { initial: { sort: { column: sortColumn, direction: sortBy.direction } } }
      : {}),
  };

  const node: DataTableNode = {
    type: 'dataTable',
    ...(chart.title ? { title: chart.title } : {}),
    ...(chart.description ? { description: chart.description } : {}),
    data,
    columns,
    ...(styling?.paging ? { pageSize: styling.paging } : {}),
    ...(density && density !== 'default' ? { density } : {}),
    ...(Object.keys(interactions).length > 0 ? { interactions } : {}),
    ...(losses.length > 0 ? { losses } : {}),
  };
  return node;
};
