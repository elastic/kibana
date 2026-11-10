/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { LegacyMetricNode } from '@kbn/isomer';
import {
  LENS_LEGACY_METRIC_DEFAULT_COLOR_STEPS,
  LENS_LEGACY_METRIC_DEFAULT_TEXT_ALIGNMENT,
  LENS_LEGACY_METRIC_DEFAULT_TITLE_POSITION,
  LENS_LEGACY_METRIC_DEFAULT_TITLE_SIZE,
} from '@kbn/lens-common';
import type { MaterializeLoss, MaterializedNode } from '../nodes';
import type { MaterializeKit } from '../types';
import type { CompiledLensLayer } from '../lens_aggs/compile_layer';
import { applyLensFormats } from './formats';
import { collectColumns, findColumn, lensLink } from './shared';
import type { LensLegacyMetricConfig, LensSavedObjectReference } from './types';
import { isColorByValue, toValueBands } from './value_colors';

/**
 * The `esaggs` table with its column renamed to the Lens column it fills, as Lens's
 * `lens_map_to_columns` renames it, and that Lens column's label.
 */
const toLensColumns = (
  table: Datatable,
  { idMap }: CompiledLensLayer
): { table: Datatable; id: string; label?: string } => {
  const [esAggsId, [lensColumn]] = Object.entries(idMap)[0];
  const column = findColumn(table, esAggsId);
  return {
    table: {
      ...table,
      columns: [{ ...column, id: lensColumn.id, name: lensColumn.label ?? column.name }],
      rows: table.rows.map((row) => ({ [lensColumn.id]: row[esAggsId] })),
    },
    id: lensColumn.id,
    label: lensColumn.label,
  };
};

/** A Lens legacy metric, compiled to its data view's `aggs` request, and its table, as a `legacyMetric` node. */
export const mapLensLegacyMetric = (
  chart: LensLegacyMetricConfig,
  compiled: CompiledLensLayer,
  [aggsTable]: Datatable[],
  kit: MaterializeKit,
  savedObject?: LensSavedObjectReference
): MaterializedNode => {
  if (!aggsTable) {
    throw new Error('A legacy metric needs its table.');
  }
  const losses: MaterializeLoss[] = [];
  const { table: queried, id, label } = toLensColumns(aggsTable, compiled);
  const metric = {
    ...chart.metric,
    column: id,
    ...(chart.metric.label ?? label ? { label: chart.metric.label ?? label } : {}),
  };
  const column = findColumn(queried, id);
  let table: Datatable = { ...queried, columns: [column] };
  // Lens's legacy metric draws a tile per row; with no breakdown, the node draws one value.
  if (table.rows.length > 1) {
    losses.push({
      path: 'data.rows',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.legacyMetricRows', {
        defaultMessage:
          'Kibana draws a tile for each of the {count} rows the query returned; only the first is drawn.',
        values: { count: table.rows.length },
      }),
    });
    table = { ...table, rows: table.rows.slice(0, 1) };
  }
  const { labels, formats } = collectColumns([metric]);
  const { data, losses: dataLosses } = kit.toChartData(applyLensFormats(table, formats), {
    roles: { [metric.column]: 'metric' },
    labels,
  });
  losses.push(...dataLosses);

  // Lens colors only a numeric value, only with `apply_color_to` (`colorMode`), and spreads a
  // named palette in 3 steps over the value's range (`LENS_LEGACY_METRIC_DEFAULT_COLOR_STEPS`).
  const colored = metric.apply_color_to && column.meta.type === 'number';
  const color = isColorByValue(metric.color) ? metric.color : undefined;
  const bands =
    colored && color
      ? toValueBands(color, {
          path: 'metric.color',
          kit,
          losses,
          steps: LENS_LEGACY_METRIC_DEFAULT_COLOR_STEPS,
        })
      : undefined;
  const size = metric.size ?? LENS_LEGACY_METRIC_DEFAULT_TITLE_SIZE;
  const labelPosition = metric.labels?.alignment ?? LENS_LEGACY_METRIC_DEFAULT_TITLE_POSITION;
  const textAlign = metric.values?.alignment ?? LENS_LEGACY_METRIC_DEFAULT_TEXT_ALIGNMENT;
  const link = lensLink(savedObject, kit.context);

  const node: LegacyMetricNode = {
    type: 'legacyMetric',
    ...(chart.title ? { title: chart.title } : {}),
    ...(chart.description ? { description: chart.description } : {}),
    data,
    ...(bands ? { colors: { bands: bands.bands } } : {}),
    metrics: [{ column: metric.column }],
    ...(size !== 'm' ? { size } : {}),
    ...(labelPosition !== 'top' ? { labelPosition } : {}),
    ...(textAlign !== 'left' ? { textAlign } : {}),
    ...(bands && metric.apply_color_to === 'value' ? { applyColorTo: 'value' as const } : {}),
    ...(bands?.range === 'percentage' ? { bandsRange: 'percentage' as const } : {}),
    ...(link ? { interactions: { link } } : {}),
    ...(losses.length > 0 ? { losses } : {}),
  };
  return node;
};
