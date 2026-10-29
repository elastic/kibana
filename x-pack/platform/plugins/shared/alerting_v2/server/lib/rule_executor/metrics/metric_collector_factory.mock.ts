/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricCollectorFactoryContract } from './types';
import { MetricCollectorFactory } from './metric_collector_factory';

export function createMetricCollectorFactory({
  startedAt = new Date('2025-01-01T00:00:00.000Z'),
}: {
  startedAt?: Date;
} = {}): MetricCollectorFactoryContract {
  return new MetricCollectorFactory({ now: () => startedAt });
}
