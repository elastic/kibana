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
import { schema, type XyChartNode } from './schema';

export { type ResolvedXy, type XyPosition, type XySeries, resolveXy } from './model';
export type { XyChartNode } from './schema';

export const xyChart: ChartDefinition<XyChartNode> = {
  type: 'xyChart',
  catalog,
  examples,
  schema,
  read,
};
