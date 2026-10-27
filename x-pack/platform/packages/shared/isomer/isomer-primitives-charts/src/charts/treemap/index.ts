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
import { schema, type TreemapNode } from './schema';

export { type ResolvedTreemap, type TreemapPart, resolveTreemap } from './model';
export type { TreemapItem, TreemapNode } from './schema';
export { MAX_TREE_DEPTH } from './walk';

export const treemap: ChartDefinition<TreemapNode> = {
  type: 'treemap',
  catalog,
  examples,
  schema,
  read,
};
