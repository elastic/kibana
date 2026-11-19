/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export enum LatencyAggregationType {
  avg = 'avg',
  p99 = 'p99',
  p95 = 'p95',
}

export const latencyAggregationTypeSchema = z.union([
  z.literal(LatencyAggregationType.avg),
  z.literal(LatencyAggregationType.p95),
  z.literal(LatencyAggregationType.p99),
]);
