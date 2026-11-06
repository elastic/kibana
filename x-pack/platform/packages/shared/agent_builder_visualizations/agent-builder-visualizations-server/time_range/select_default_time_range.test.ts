/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { selectDefaultTimeRange } from './select_default_time_range';

const NOW = new Date('2026-06-26T12:00:00.000Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

const Q_TIME_BOUND =
  'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS count = COUNT(*)';

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createEsClient = (overrides: {
  search?: jest.Mock;
  fieldCaps?: jest.Mock;
}): IScopedClusterClient =>
  ({
    asCurrentUser: {
      search: overrides.search ?? jest.fn(),
      fieldCaps: overrides.fieldCaps ?? jest.fn(),
    },
  } as unknown as IScopedClusterClient);

const minMaxResponse = (minMs: number | null, maxMs: number | null) => ({
  aggregations: { min_time: { value: minMs }, max_time: { value: maxMs } },
});

describe('selectDefaultTimeRange', () => {
  it('returns undefined without calling ES when there are no queries', async () => {
    const search = jest.fn();
    const result = await selectDefaultTimeRange({
      esqlQueries: [],
      esClient: createEsClient({ search }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result).toBeUndefined();
    expect(search).not.toHaveBeenCalled();
  });

  it('sets a 24h relative range from the probed min/max for live data', async () => {
    const search = jest.fn().mockResolvedValue(minMaxResponse(NOW - 5 * DAY_MS, NOW));
    const fieldCaps = jest.fn();

    const result = await selectDefaultTimeRange({
      esqlQueries: [Q_TIME_BOUND],
      esClient: createEsClient({ search, fieldCaps }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result).toEqual({ from: 'now-24h', to: 'now', mode: 'relative' });
    expect(fieldCaps).not.toHaveBeenCalled();
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ index: 'logs-*' }));
  });

  it('isolates a failing dataset and still computes from the healthy ones', async () => {
    const Q_METRICS =
      'FROM metrics-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS count = COUNT(*)';
    const search = jest
      .fn()
      .mockImplementation((params: { index: string }) =>
        params.index === 'logs-*'
          ? Promise.reject(new Error('index_not_found_exception'))
          : Promise.resolve(minMaxResponse(NOW - 5 * DAY_MS, NOW))
      );

    const result = await selectDefaultTimeRange({
      esqlQueries: [Q_TIME_BOUND, Q_METRICS],
      esClient: createEsClient({ search }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result).toEqual({ from: 'now-24h', to: 'now', mode: 'relative' });
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when the only dataset probe errors', async () => {
    const search = jest.fn().mockRejectedValue(new Error('cluster_block_exception'));

    const result = await selectDefaultTimeRange({
      esqlQueries: [Q_TIME_BOUND],
      esClient: createEsClient({ search }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result).toBeUndefined();
  });
});
