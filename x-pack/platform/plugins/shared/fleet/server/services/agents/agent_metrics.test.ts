/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import { fetchAndAssignAgentMetrics } from './agent_metrics';

describe('fetchAndAssignAgentMetrics', () => {
  const mockLogger = { warn: jest.fn() } as any;
  beforeAll(() => {
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns agents with metrics from both fleet and opamp', async () => {
    const esClient = {
      search: jest
        .fn()
        // First call: _fetchAndAssignAgentMetrics (for FLEET)
        .mockResolvedValueOnce({
          aggregations: {
            agents: {
              buckets: [
                { key: 'a1', sum_memory_size: { value: 100 }, sum_cpu: { value: 1.23 } },
                { key: 'a3', sum_memory_size: { value: 300 }, sum_cpu: { value: 3.23 } },
              ],
            },
          },
        })
        // Second call: _fetchAndAssignOtelMetrics (for OPAMP)
        .mockResolvedValueOnce({
          aggregations: {
            agents: {
              buckets: [{ key: 'a2', avg_memory_size: { value: 200 }, avg_cpu: { value: 2.34 } }],
            },
          },
        }),
    };
    const agents = [
      { id: 'a1', type: 'FLEET' },
      { id: 'a2', type: 'OPAMP' },
      { id: 'a3', type: 'FLEET' },
    ];
    const result = await fetchAndAssignAgentMetrics(esClient as any, agents as any);
    expect(result).toEqual([
      { id: 'a1', type: 'FLEET', metrics: { cpu_avg: 1.23, memory_size_byte_avg: 100 } },
      { id: 'a2', type: 'OPAMP', metrics: { cpu_avg: 2.34, memory_size_byte_avg: 200 } },
      { id: 'a3', type: 'FLEET', metrics: { cpu_avg: 3.23, memory_size_byte_avg: 300 } },
    ]);
    expect(esClient.search).toHaveBeenCalledTimes(2);
  });
});
