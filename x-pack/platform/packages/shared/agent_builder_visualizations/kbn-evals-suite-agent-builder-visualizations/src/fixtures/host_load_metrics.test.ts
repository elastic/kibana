/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultTimeBounds } from '../evaluators/esql_bind_params';
import {
  HOST_METRICS_INDEX,
  HOST_NAME,
  assertHostLoadMetricsReady,
  buildHostLoadEvents,
  cleanHostLoadMetrics,
} from './host_load_metrics';

describe('buildHostLoadEvents', () => {
  const now = Date.UTC(2026, 8, 16, 12, 0, 0);

  it('emits Beats load metricsets with 1/5/15 averages inside the eval window', () => {
    const events = buildHostLoadEvents({ now, count: 3 });
    const bounds = getDefaultTimeBounds(now);

    expect(events).toHaveLength(3);
    for (const event of events) {
      const [doc] = event.serialize();
      const timestamp = new Date(doc['@timestamp'] ?? 0).toISOString();
      expect(timestamp >= bounds.tstart).toBe(true);
      expect(timestamp <= new Date(now).toISOString()).toBe(true);
      expect(doc['metricset.name']).toBe('load');
      expect(doc['system.load']).toEqual(
        expect.objectContaining({
          1: expect.any(Number),
          5: expect.any(Number),
          15: expect.any(Number),
        })
      );
    }
  });

  it('tags every document with the run id when given', () => {
    const events = buildHostLoadEvents({ now, count: 2, runId: 'viz-eval-run' });

    for (const event of events) {
      const [doc] = event.serialize();
      expect(doc['agent.id']).toBe('viz-eval-run');
    }
  });

  it('defaults to one document per auto-bucket', () => {
    expect(buildHostLoadEvents({ now })).toHaveLength(75);
  });
});

describe('cleanHostLoadMetrics', () => {
  const RUN_QUERY = {
    index: HOST_METRICS_INDEX,
    query: {
      bool: {
        filter: [{ term: { 'host.name': HOST_NAME } }, { term: { 'agent.id': 'viz-eval-run' } }],
      },
    },
    refresh: true,
  };

  const createEsClient = () => ({
    indices: { deleteDataStream: jest.fn().mockResolvedValue({}) },
    deleteByQuery: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue({ count: 0 }),
  });

  it('removes only the documents this run seeded and keeps the data stream', async () => {
    const esClient = createEsClient();

    await cleanHostLoadMetrics(esClient as never, { runId: 'viz-eval-run' });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(RUN_QUERY);
    expect(esClient.count).not.toHaveBeenCalled();
    expect(esClient.indices.deleteDataStream).not.toHaveBeenCalled();
  });

  it('warns instead of throwing when cleanup fails', async () => {
    const esClient = createEsClient();
    esClient.deleteByQuery.mockRejectedValue(new Error('boom'));
    const log = { warning: jest.fn() };

    await expect(
      cleanHostLoadMetrics(esClient as never, { runId: 'viz-eval-run' }, log as never)
    ).resolves.toBeUndefined();
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});

describe('assertHostLoadMetricsReady', () => {
  it('throws when the load data stream does not exist', async () => {
    const esClient = {
      indices: { exists: jest.fn().mockResolvedValue(false) },
      count: jest.fn(),
    };

    await expect(assertHostLoadMetricsReady(esClient as never)).rejects.toThrow(HOST_METRICS_INDEX);
    expect(esClient.count).not.toHaveBeenCalled();
  });

  it('throws when the load data stream is empty', async () => {
    const esClient = {
      indices: { exists: jest.fn().mockResolvedValue(true) },
      count: jest.fn().mockResolvedValue({ count: 0 }),
    };

    await expect(assertHostLoadMetricsReady(esClient as never)).rejects.toThrow(HOST_METRICS_INDEX);
  });
});
