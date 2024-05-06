/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import { IN_MEMORY_METRICS } from '.';
import { InMemoryMetrics } from './in_memory_metrics';

export function registerNodeCollector({
  monitoringCollection,
  inMemoryMetrics,
}: {
  monitoringCollection: MonitoringCollectionSetup;
  inMemoryMetrics: InMemoryMetrics;
}) {
  monitoringCollection.registerMetric({
    type: 'node_rules',
    schema: {
      failures: {
        type: 'long',
      },
      executions: {
        type: 'long',
      },
      timeouts: {
        type: 'long',
      },
    },
    fetch: async () => {
      return {
        failures: inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.RULE_FAILURES),
        executions: inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.RULE_EXECUTIONS),
        timeouts: inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.RULE_TIMEOUTS),
      };
    },
  });
}
