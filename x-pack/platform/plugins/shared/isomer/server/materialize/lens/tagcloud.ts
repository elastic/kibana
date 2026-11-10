/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { TagCloudNode } from '@kbn/isomer';
import { LENS_TAGCLOUD_DEFAULT_STATE } from '@kbn/lens-common';
import { KbnPalette } from '@kbn/palettes';
import type { MaterializeLoss, MaterializedNode } from '../nodes';
import type { MaterializeKit } from '../types';
import type { ConcreteColor } from '../kit/colors';
import type { ChartColumnRole } from '../kit/types';
import { categoryColorsByKey } from './color_mapping';
import { applyLensFormats } from './formats';
import { collectColumns, findColumn, lensLink, toKeyPart } from './shared';
import type { LensTagcloudConfig, LensSavedObjectReference } from './types';

/** Lens's orientations (`TAGCLOUD_ORIENTATION`), by the API's `styling.orientation`. */
const ORIENTATIONS: Record<string, NonNullable<TagCloudNode['orientation']>> = {
  horizontal: 'single',
  vertical: 'rightAngled',
  angled: 'multiple',
};

/**
 * Each tag's color as Lens's tag cloud picks it: through the color mapping over Lens's
 * categories, or else the legacy `default` palette by the row a tag first appears in
 * (`getColor`'s `rankAtDepth`, out of every row).
 */
const tagColors = (
  chart: LensTagcloudConfig,
  table: Datatable,
  kit: MaterializeKit
): Record<string, ConcreteColor> => {
  const { column, color } = chart.tag_by;
  if (color) {
    return categoryColorsByKey(table.rows, [column], color, kit);
  }
  const palette = kit.paletteColors(Math.max(table.rows.length, 1), KbnPalette.Default);
  const byKey: Record<string, ConcreteColor> = {};
  table.rows.forEach((row, index) => {
    const key = toKeyPart(row[column]);
    byKey[key] ??= palette[index];
  });
  return byKey;
};

/** A Lens ES|QL tag cloud and its query's table, as a `tagCloud` node. */
export const mapLensTagcloud = (
  chart: LensTagcloudConfig,
  [queried]: Datatable[],
  kit: MaterializeKit,
  savedObject?: LensSavedObjectReference
): MaterializedNode => {
  if (!queried) {
    throw new Error('A tag cloud needs its table.');
  }
  const losses: MaterializeLoss[] = [];
  const { tag_by: tags, metric, styling } = chart;
  const refs = [tags, metric];
  const table: Datatable = {
    ...queried,
    columns: refs.map(({ column }) => findColumn(queried, column)),
  };
  const { labels, formats } = collectColumns(refs);
  const roles: Record<string, ChartColumnRole> = {
    [tags.column]: 'dimension',
    [metric.column]: 'metric',
  };
  const { data, losses: dataLosses } = kit.toChartData(applyLensFormats(table, formats), {
    roles,
    labels,
  });
  losses.push(...dataLosses);

  const orientation = styling?.orientation ? ORIENTATIONS[styling.orientation] : undefined;
  const {
    min = LENS_TAGCLOUD_DEFAULT_STATE.minFontSize,
    max = LENS_TAGCLOUD_DEFAULT_STATE.maxFontSize,
  } = styling?.font_size ?? {};
  const showLabel = styling?.caption?.visible ?? LENS_TAGCLOUD_DEFAULT_STATE.showCaption;
  const link = lensLink(savedObject, kit.context);

  // Lens's tag clouds always scale linearly: its API has no scale, and its expression's default
  // is `linear`.
  const node: TagCloudNode = {
    type: 'tagCloud',
    ...(chart.title ? { title: chart.title } : {}),
    ...(chart.description ? { description: chart.description } : {}),
    data,
    colors: { byKey: tagColors(chart, table, kit) },
    tags: { column: tags.column },
    metric: { column: metric.column },
    ...(orientation && orientation !== 'single' ? { orientation } : {}),
    fontSize: { min, max },
    ...(showLabel ? {} : { showLabel: false }),
    interactions: { select: ['tag'], ...(link ? { link } : {}) },
    ...(losses.length > 0 ? { losses } : {}),
  };
  return node;
};
