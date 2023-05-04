/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import { metrics } from '@opentelemetry/api-metrics';
import { generateOtelMetrics } from './routes';
import { Metrics } from './monitoring/metrics';

export class OpenTelemetryUsageTest implements Plugin {
  private metrics: Metrics;

  constructor() {
    this.metrics = new Metrics(metrics.getMeter('dummyMetric'));
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    generateOtelMetrics(router, this.metrics);
  }

  public start() {}
  public stop() {}
}
