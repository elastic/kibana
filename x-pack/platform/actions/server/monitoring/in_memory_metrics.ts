/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';

export enum IN_MEMORY_METRICS {
  ACTION_EXECUTIONS = 'actionExecutions',
  ACTION_FAILURES = 'actionFailures',
  ACTION_TIMEOUTS = 'actionTimeouts',
}

export class InMemoryMetrics {
  private logger: Logger;
  private inMemoryMetrics: Record<IN_MEMORY_METRICS, number | null> = {
    [IN_MEMORY_METRICS.ACTION_EXECUTIONS]: 0,
    [IN_MEMORY_METRICS.ACTION_FAILURES]: 0,
    [IN_MEMORY_METRICS.ACTION_TIMEOUTS]: 0,
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public increment(metric: IN_MEMORY_METRICS) {
    if (this.inMemoryMetrics[metric] === null) {
      this.logger.info(
        `Metric ${metric} is null because the counter ran over the max safe integer value, skipping increment.`
      );
      return;
    }

    if ((this.inMemoryMetrics[metric] as number) >= Number.MAX_SAFE_INTEGER) {
      this.inMemoryMetrics[metric] = null;
      this.logger.info(
        `Metric ${metric} has reached the max safe integer value and will no longer be used, skipping increment.`
      );
    } else {
      (this.inMemoryMetrics[metric] as number)++;
    }
  }

  public getInMemoryMetric(metric: IN_MEMORY_METRICS) {
    return this.inMemoryMetrics[metric];
  }

  public getAllInMemoryMetrics() {
    return this.inMemoryMetrics;
  }
}
