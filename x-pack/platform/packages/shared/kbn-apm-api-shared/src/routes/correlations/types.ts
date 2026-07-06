/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const entityTypeRt = t.union([t.literal('transaction'), t.literal('exit_span')]);

export const metricRt = t.union([
  t.literal('latency'),
  t.literal('failure_rate'),
  t.literal('throughput'),
  t.literal('infra_metrics'),
]);
