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
import { type DonutNode, schema } from './schema';

export { type DonutPart, type ResolvedDonut, resolveDonut } from './model';
export type { DonutNode } from './schema';

export const donut: ChartDefinition<DonutNode> = {
  type: 'donut',
  catalog,
  examples,
  schema,
  read,
};
