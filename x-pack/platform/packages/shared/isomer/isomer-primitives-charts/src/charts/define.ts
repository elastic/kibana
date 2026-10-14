/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry, PrimitiveNode, z } from '@elastic/isomer-sdk';

import type { ChartHeading, ChartReading } from '../render/surfaces';

export const CHART_TYPES = [
  'donut',
  'gauge',
  'heatmap',
  'metricTrend',
  'treemap',
  'xyChart',
] as const;

export type ChartType = (typeof CHART_TYPES)[number];

export type ChartNode = PrimitiveNode & { type: ChartType };

/** A chart type's schema, catalog, examples, and reading, bound to renderers in `chartsPack`. */
export interface ChartDefinition<TNode extends ChartNode & ChartHeading> {
  type: TNode['type'];
  catalog: PrimitiveCatalogEntry;
  examples: readonly TNode[];
  schema: z.ZodType;
  /** The chart as words and data, for every surface. */
  read(this: void, node: TNode): ChartReading;
}
