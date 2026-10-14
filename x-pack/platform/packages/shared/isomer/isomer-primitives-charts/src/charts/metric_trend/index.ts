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
import { type MetricTrendNode, schema } from './schema';

export {
  type MetricChange,
  type MetricDirection,
  type MetricTrendPoint,
  type ResolvedMetricTrend,
  resolveMetricTrend,
} from './model';
export type { MetricTrendNode } from './schema';

export const metricTrend: ChartDefinition<MetricTrendNode> = {
  type: 'metricTrend',
  catalog,
  examples,
  schema,
  read,
};
