/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { getMetricChangePoints, getTopMetricChangePoints } from './get_metric_change_points';

describe('getMetricChangePoints', () => {
  it('groups by host.name, aggregates the requested metric, and forwards the abort signal', async () => {
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        groups: {
          buckets: [
            {
              key: 'web-1',
              changes: {
                type: { spike: { p_value: 0.002 } },
                bucket: { key: '2026-11-02T11:30:00.000Z', doc_count: 10 },
              },
              time_series: {
                buckets: [{ key: 1, key_as_string: '2026-11-02T11:30:00.000Z', doc_count: 10 }],
              },
            },
          ],
        },
      },
    });
    const esClient = { asCurrentUser: { search } } as unknown as IScopedClusterClient;
    const controller = new AbortController();

    const result = await getMetricChangePoints({
      esClient,
      index: 'metrics-*,metricbeat-*',
      start: '2026-11-02T06:00:00.000Z',
      end: '2026-11-02T12:00:00.000Z',
      kqlFilter: 'host.name : "web-1"',
      groupBy: ['host.name'],
      aggregation: { field: 'system.cpu.total.norm.pct', type: 'avg' },
      signal: controller.signal,
    });

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('web-1');
    expect(result[0].changes.type).toBe('spike');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'metrics-*,metricbeat-*',
        aggs: expect.objectContaining({
          groups: expect.objectContaining({
            terms: { field: 'host.name' },
          }),
        }),
      }),
      { signal: controller.signal }
    );
  });

  it('orders results by p_value and caps at 25 in getTopMetricChangePoints', async () => {
    const buckets = Array.from({ length: 30 }, (_, index) => ({
      key: `host-${index}`,
      changes: {
        type: { spike: { p_value: index === 0 ? 0.5 : 0.001 } },
        bucket: { key: '2026-11-02T11:30:00.000Z', doc_count: 10 },
      },
      time_series: { buckets: [] },
    }));
    const search = jest.fn().mockResolvedValue({
      aggregations: { groups: { buckets } },
    });
    const esClient = { asCurrentUser: { search } } as unknown as IScopedClusterClient;

    const top = await getTopMetricChangePoints({
      esClient,
      index: 'metrics-*',
      start: '2026-11-02T06:00:00.000Z',
      end: '2026-11-02T12:00:00.000Z',
      groupBy: ['host.name'],
      aggregation: undefined,
    });

    expect(top).toHaveLength(25);
    expect(top.some((item) => item.key === 'host-0')).toBe(false);
  });
});
