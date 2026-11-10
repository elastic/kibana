/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { PartitionChartNode } from '@kbn/isomer';
import { PARTITION_EMPTY_SIZE_RADIUS } from '@kbn/lens-common';
import { KbnPalette } from '@kbn/palettes';
import type { MaterializeLoss, MaterializedNode } from '../nodes';
import type { MaterializeKit } from '../types';
import type { ConcreteColor } from '../kit/colors';
import type { ChartColumnRole } from '../kit/types';
import { collapseTable } from './collapse';
import { categoryColorsByKey } from './color_mapping';
import { applyLensFormats } from './formats';
import type { LensColumnRef } from './shared';
import { collectColumns, findColumn, fixedColor, lensLink } from './shared';
import type { LensApiColorMapping, LensPartitionConfig, LensSavedObjectReference } from './types';

type Shape = PartitionChartNode['shape'];
type Labels = NonNullable<PartitionChartNode['labels']>;
type Legend = NonNullable<PartitionChartNode['legend']>;

interface Group extends LensColumnRef {
  collapse_by?: 'sum' | 'avg' | 'min' | 'max';
  color?: LensApiColorMapping | { type: string };
}

interface Metric extends LensColumnRef {
  color?: { type: 'static'; color: string } | { type: string };
}

/** Lens's donut hole sizes (`PARTITION_EMPTY_SIZE_RADIUS`), by the API's `donut_hole`. */
const DONUT_HOLES: Record<'s' | 'm' | 'l', number> = {
  s: PARTITION_EMPTY_SIZE_RADIUS.SMALL,
  m: PARTITION_EMPTY_SIZE_RADIUS.MEDIUM,
  l: PARTITION_EMPTY_SIZE_RADIUS.LARGE,
};

const metricsOf = (chart: LensPartitionConfig): Metric[] =>
  chart.type === 'mosaic' ? [chart.metric] : chart.metrics;

/**
 * Groups outermost first. Lens's mosaic flips its buckets (`generateMosaicVisAst`), so its
 * `group_breakdown_by` is the outer layer and its `group_by` the inner one.
 */
const groupsOf = (chart: LensPartitionConfig): Array<{ group: Group; path: string }> => {
  const groupBy = (chart.group_by ?? []).map((group, index) => ({
    group,
    path: `group_by[${index}]`,
  }));
  if (chart.type !== 'mosaic') {
    return groupBy;
  }
  const breakdown = (chart.group_breakdown_by ?? []).map((group, index) => ({
    group,
    path: `group_breakdown_by[${index}]`,
  }));
  return [...breakdown, ...groupBy];
};

const shapeOf = (chart: LensPartitionConfig): Shape => {
  if (chart.type !== 'pie') {
    return chart.type;
  }
  const hole = chart.styling?.donut_hole;
  return hole && hole !== 'none' ? 'donut' : 'pie';
};

/**
 * Slice labels as Lens's API transform sets `categoryDisplay` and `numberDisplay`: a pie hides
 * its names or keeps them inside, a treemap only hides them, and values are percentages unless
 * the API asks for absolute values or none.
 */
const labelsOf = (chart: LensPartitionConfig): Labels | undefined => {
  const styling = chart.styling;
  const labels: Labels = {};
  if (chart.type === 'pie' || chart.type === 'treemap') {
    const categories = chart.styling?.labels;
    if (categories?.visible === false) {
      labels.categories = 'hidden';
    } else if (chart.type === 'pie' && chart.styling?.labels?.position === 'inside') {
      labels.categories = 'inside';
    }
  }
  const values = styling?.values;
  if (values?.visible === false) {
    labels.values = 'hidden';
  } else if (values?.mode === 'absolute') {
    labels.values = 'value';
  }
  if (values?.percent_decimals !== undefined && values.percent_decimals !== 2) {
    labels.percentDecimals = values.percent_decimals;
  }
  return Object.keys(labels).length > 0 ? labels : undefined;
};

const legendOf = (chart: LensPartitionConfig): Legend | undefined => {
  const legend = chart.legend;
  const result: Legend = {
    ...(legend?.visibility ? { visibility: legend.visibility } : {}),
    ...(legend?.position ? { position: legend.position } : {}),
    ...(legend && 'nested' in legend && legend.nested ? { nested: true } : {}),
    ...(legend?.truncate_after_lines ? { maxLines: legend.truncate_after_lines } : {}),
    ...(legend?.size ? { size: legend.size } : {}),
    // A waffle shows values in its legend only when the API lists them (`legendStats`).
    ...(chart.type === 'waffle' && !chart.legend?.values?.includes('absolute')
      ? { values: false }
      : {}),
  };
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Lens's `lens_collapse` for each collapsed group, in order: the metrics folded over the rows that
 * share every other group still in the table.
 */
const collapseGroups = (table: Datatable, groups: Group[], metrics: string[]): Datatable => {
  let collapsed = table;
  const remaining = groups.map(({ column }) => column);
  for (const group of groups) {
    if (!group.collapse_by) {
      continue;
    }
    remaining.splice(remaining.indexOf(group.column), 1);
    collapsed = collapseTable(collapsed, remaining, metrics, group.collapse_by);
  }
  return collapsed;
};

/**
 * The slice colors, keyed as `partitionChart` names them. Lens colors the outermost group (on a
 * two-group mosaic, the second: `getColorCategoriesForChart`) through the first group's color
 * mapping, or Lens's default palette; inner layers derive theirs from it. It looks each slice up
 * by its text (`getCategoryKeys`), so a missing value takes the mapping's unassigned color.
 * Without groups, each metric slice takes its static color or its place in the default palette.
 */
const colorsOf = (
  chart: LensPartitionConfig,
  table: Datatable,
  groups: Group[],
  metrics: Metric[],
  kit: MaterializeKit,
  losses: MaterializeLoss[]
): Record<string, ConcreteColor> => {
  const colored = chart.type === 'mosaic' && groups.length === 2 ? groups[1] : groups[0];
  const mapping = (chart.group_by ?? []).find(({ color }) => color != null)?.color as
    | LensApiColorMapping
    | { type: string }
    | undefined;
  const staticColors = metrics.some(({ color }) => color?.type === 'static');
  if (colored) {
    if (staticColors) {
      losses.push({
        path: 'metrics',
        kind: 'dropped',
        note: i18n.translate('xpack.isomer.materialize.lens.partitionMetricColors', {
          defaultMessage: 'Slices take their groups’ colors, not the metrics’ static colors.',
        }),
      });
    }
    return categoryColorsByKey(
      table.rows,
      [colored.column],
      mapping && !('type' in mapping) ? mapping : undefined,
      kit,
      { byText: true }
    );
  }
  const palette = kit.paletteColors(metrics.length, KbnPalette.Default);
  return Object.fromEntries(
    metrics.map(({ column, color }, index) => [
      column,
      color?.type === 'static' && 'color' in color ? fixedColor(color.color) : palette[index],
    ])
  );
};

/** A Lens ES|QL pie, donut, treemap, mosaic or waffle chart and its table, as a `partitionChart`. */
export const mapLensPartition = (
  chart: LensPartitionConfig,
  [queried]: Datatable[],
  kit: MaterializeKit,
  savedObject?: LensSavedObjectReference
): MaterializedNode => {
  if (!queried) {
    throw new Error('A partition chart needs its table.');
  }
  const losses: MaterializeLoss[] = [];
  const metrics = metricsOf(chart);
  const allGroups = groupsOf(chart);
  for (const { column } of [...metrics, ...allGroups.map(({ group }) => group)]) {
    findColumn(queried, column);
  }
  const table = collapseGroups(
    queried,
    allGroups.map(({ group }) => group),
    metrics.map(({ column }) => column)
  );
  const groups = allGroups.map(({ group }) => group).filter(({ collapse_by: fn }) => !fn);

  const { labels, formats } = collectColumns([...groups, ...metrics]);
  const roles: Record<string, ChartColumnRole> = {};
  for (const { column } of metrics) {
    roles[column] = 'metric';
  }
  for (const { column } of groups) {
    roles[column] = 'dimension';
  }
  const shown: Datatable = {
    ...table,
    columns: [...groups, ...metrics].map(({ column }) => findColumn(table, column)),
  };
  const { data, losses: dataLosses } = kit.toChartData(applyLensFormats(shown, formats), {
    roles,
    labels,
  });
  losses.push(...dataLosses);

  const shape = shapeOf(chart);
  const hole = chart.type === 'pie' ? chart.styling?.donut_hole : undefined;
  const nodeLabels = labelsOf(chart);
  const legend = legendOf(chart);
  const byKey = colorsOf(chart, table, groups, metrics, kit, losses);
  const link = lensLink(savedObject, kit.context);
  const interactions: NonNullable<PartitionChartNode['interactions']> = {
    ...(groups.length > 0 ? { select: ['slice' as const] } : {}),
    ...(link ? { link } : {}),
  };

  const node: PartitionChartNode = {
    type: 'partitionChart',
    ...(chart.title ? { title: chart.title } : {}),
    ...(chart.description ? { description: chart.description } : {}),
    data,
    ...(Object.keys(byKey).length > 0 ? { colors: { byKey } } : {}),
    shape,
    metrics: metrics.map(({ column }) => ({ column })),
    ...(groups.length > 0 ? { groups: groups.map(({ column }) => ({ column })) } : {}),
    ...(nodeLabels ? { labels: nodeLabels } : {}),
    ...(shape === 'donut' && hole && hole !== 'none' ? { donutHole: DONUT_HOLES[hole] } : {}),
    ...(legend ? { legend } : {}),
    ...(Object.keys(interactions).length > 0 ? { interactions } : {}),
    ...(losses.length > 0 ? { losses } : {}),
  };
  return node;
};
