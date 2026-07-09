/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';

export const instancesSortFieldRt = t.keyof({
  serviceNodeName: null,
  latency: null,
  throughput: null,
  errorRate: null,
  cpuUsage: null,
  memoryUsage: null,
});

export type InstancesSortField = t.TypeOf<typeof instancesSortFieldRt>;

/**
 * zod equivalent, additive (see `default_api_types.ts` in `@kbn/apm-api-shared`
 * for why - elastic/kibana#243355).
 */
export const instancesSortFieldSchema = z.enum([
  'serviceNodeName',
  'latency',
  'throughput',
  'errorRate',
  'cpuUsage',
  'memoryUsage',
]);
