/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricOptions } from './metric';
import { Metric } from './metric';

export type ClusterMetricOptions = MetricOptions & {
  uuidField: string;
};

export class ClusterMetric extends Metric {
  constructor(opts: ClusterMetricOptions) {
    super({
      ...opts,
      uuidField: 'cluster_uuid',
    });
  }
}
