/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { GaugeNode } from '@kbn/isomer';
import { LENS_GAUGE_DEFAULT_COLOR_STEPS } from '@kbn/lens-common';
import type { MaterializeLoss, MaterializedNode } from '../nodes';
import type { MaterializeKit } from '../types';
import type { ChartColumnRole } from '../kit/types';
import { applyLensFormats } from './formats';
import { collectColumns, findColumn, lensLink } from './shared';
import type { LensGaugeConfig, LensSavedObjectReference } from './types';
import { isColorByValue, toValueBands } from './value_colors';

type Shape = GaugeNode['shape'];
type ApiShape = NonNullable<NonNullable<LensGaugeConfig['styling']>['shape']>;

/** Lens's palette for a gauge with no colors of its own (the gauge's `DEFAULT_PALETTE`). */
const DEFAULT_GAUGE_PALETTE = 'status';

/** The shape as Lens's API transform sets it: a horizontal bullet unless the API says otherwise. */
const shapeOf = (shape: ApiShape | undefined): Shape => {
  if (!shape) {
    return 'horizontalBullet';
  }
  if (shape.type === 'bullet') {
    return shape.orientation === 'vertical' ? 'verticalBullet' : 'horizontalBullet';
  }
  return shape.type === 'semi_circle' ? 'semiCircle' : shape.type;
};

/** A Lens ES|QL gauge and its query's table, as a `gauge` node. */
export const mapLensGauge = (
  chart: LensGaugeConfig,
  [queried]: Datatable[],
  kit: MaterializeKit,
  savedObject?: LensSavedObjectReference
): MaterializedNode => {
  if (!queried) {
    throw new Error('A gauge needs its table.');
  }
  const losses: MaterializeLoss[] = [];
  const { metric } = chart;
  const bounds = (['min', 'max', 'goal'] as const).flatMap((key) =>
    metric[key] ? [{ key, ref: metric[key]! }] : []
  );
  const refs = [metric, ...bounds.map(({ ref }) => ref)];
  // Lens's gauge reads the first row (`data.rows[0]`).
  let table: Datatable = {
    ...queried,
    columns: [...new Set(refs.map(({ column }) => column))].map((id) => findColumn(queried, id)),
  };
  if (table.rows.length > 1) {
    losses.push({
      path: 'data.rows',
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.gaugeRows', {
        defaultMessage: 'Kibana shows the first of the {count} rows the query returned.',
        values: { count: table.rows.length },
      }),
    });
    table = { ...table, rows: table.rows.slice(0, 1) };
  }
  const { labels, formats } = collectColumns(refs);
  const roles: Record<string, ChartColumnRole> = Object.fromEntries(
    table.columns.map(({ id }) => [id, 'metric' as const])
  );
  const { data, losses: dataLosses } = kit.toChartData(applyLensFormats(table, formats), {
    roles,
    labels,
  });
  losses.push(...dataLosses);

  // Lens colors the scale with `status` in 4 equal steps unless told otherwise (`colorMode:
  // 'palette'` with no palette), and leaves it uncolored for `none`.
  const color = metric.color;
  const bands =
    color?.type === 'none'
      ? undefined
      : toValueBands(isColorByValue(color) ? color : undefined, {
          path: 'metric.color',
          kit,
          losses,
          steps: LENS_GAUGE_DEFAULT_COLOR_STEPS,
          defaultPalette: DEFAULT_GAUGE_PALETTE,
          colorsValues: false,
        });

  // Lens's ticks: hidden, or at the band edges unless `auto` (`ticksPosition`, default `bands`).
  const ticks = metric.ticks?.visible === false ? 'hidden' : metric.ticks?.mode ?? 'bands';
  const title = metric.title;
  const major = title?.visible === false ? false : title?.text;
  const link = lensLink(savedObject, kit.context);

  const node: GaugeNode = {
    type: 'gauge',
    ...(chart.title ? { title: chart.title } : {}),
    ...(chart.description ? { description: chart.description } : {}),
    data,
    ...(bands ? { colors: { bands: bands.bands } } : {}),
    shape: shapeOf(chart.styling?.shape),
    value: { column: metric.column },
    ...Object.fromEntries(bounds.map(({ key, ref }) => [key, { column: ref.column }])),
    ...(bands?.range === 'percentage' ? { bandsRange: 'percentage' as const } : {}),
    ...(ticks !== 'auto' ? { ticks } : {}),
    ...(major !== undefined || metric.subtitle
      ? {
          labels: {
            ...(major !== undefined ? { major } : {}),
            ...(metric.subtitle ? { minor: metric.subtitle } : {}),
          },
        }
      : {}),
    ...(link ? { interactions: { link } } : {}),
    ...(losses.length > 0 ? { losses } : {}),
  };
  return node;
};
