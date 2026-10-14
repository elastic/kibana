/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartDefinition } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { read } from './read';
import { type HeatmapNode, schema } from './schema';

export {
  type HeatmapBand,
  type HeatmapPosition,
  type ResolvedColorScale,
  type ResolvedHeatmap,
  bandIndex,
  resolveHeatmap,
} from './model';
export type { HeatmapNode } from './schema';

export const heatmap: ChartDefinition<HeatmapNode> = {
  type: 'heatmap',
  catalog,
  examples,
  schema,
  read,
};
