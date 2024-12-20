/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { monitoringCollectionMock } from '@kbn/monitoring-collection-plugin/server/mocks';
import { Metric } from '@kbn/monitoring-collection-plugin/server';
import { registerNodeCollector } from './register_node_collector';
import { NodeActionsMetric } from './types';
import { IN_MEMORY_METRICS } from '.';
import { inMemoryMetricsMock } from './in_memory_metrics.mock';

describe('registerNodeCollector()', () => {
  const monitoringCollection = monitoringCollectionMock.createSetup();
  const inMemoryMetrics = inMemoryMetricsMock.create();

  it('should get in memory action metrics', async () => {
    const metrics: Record<string, Metric<unknown>> = {};
    monitoringCollection.registerMetric.mockImplementation((metric) => {
      metrics[metric.type] = metric;
    });
    registerNodeCollector({ monitoringCollection, inMemoryMetrics });

    const metricTypes = Object.keys(metrics);
    expect(metricTypes.length).toBe(1);
    expect(metricTypes[0]).toBe('node_actions');

    (inMemoryMetrics.getInMemoryMetric as jest.Mock).mockImplementation((metric) => {
      switch (metric) {
        case IN_MEMORY_METRICS.ACTION_FAILURES:
          return 2;
        case IN_MEMORY_METRICS.ACTION_EXECUTIONS:
          return 10;
        case IN_MEMORY_METRICS.ACTION_TIMEOUTS:
          return 1;
      }
    });

    const result = (await metrics.node_actions.fetch()) as NodeActionsMetric;
    expect(result).toStrictEqual({ failures: 2, executions: 10, timeouts: 1 });
  });
});
