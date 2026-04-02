/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
  computeQualityMetrics,
  detectFailureStoreStatus,
  createGetDataQualityTool,
} from './get_data_quality';
import { createMockGetScopedClients, createMockToolContext } from './test_helpers';

jest.mock('../../routes/streams/doc_counts/get_streams_doc_counts', () => ({
  getDocCountsForStreams: jest.fn(),
  getDegradedDocCountsForStreams: jest.fn(),
  getFailedDocCountsForStreams: jest.fn(),
}));

const { getDocCountsForStreams, getDegradedDocCountsForStreams, getFailedDocCountsForStreams } =
  jest.requireMock('../../routes/streams/doc_counts/get_streams_doc_counts');

describe('createGetDataQualityTool handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockIngestDefinition = {
    name: 'logs',
    ingest: {
      wired: { fields: {}, routing: [] },
      processing: [],
      lifecycle: { inherit: {} },
      failure_store: { inherit: {} },
    },
  } as unknown as Streams.all.Definition;

  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const tool = createGetDataQualityTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, streamsClient };
  };

  it('returns lifecycle and recent field names', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue(mockIngestDefinition);
    getDocCountsForStreams.mockResolvedValue([{ stream: 'logs', count: 1000 }]);
    getDegradedDocCountsForStreams.mockResolvedValue([{ stream: 'logs', count: 50 }]);
    getFailedDocCountsForStreams.mockResolvedValue([{ stream: 'logs', count: 10 }]);

    const result = await tool.handler({ name: 'logs', start: 'now-24h', end: 'now' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.lifecycle_total_docs).toBe(1000);
      expect(data.lifecycle_degraded_docs).toBe(50);
      expect(data.recent_failed_docs).toBe(10);
      expect(data.recent_failed_time_range).toEqual({ start: 'now-24h', end: 'now' });
      expect(data.quality).toBeDefined();
      expect(data.failure_store_status).toBe('inherited');
    }
  });

  it('returns error for not-found stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockRejectedValue(
      Object.assign(new Error('Cannot find stream'), { statusCode: 404 })
    );

    const result = await tool.handler({ name: 'no.exist', start: 'now-24h', end: 'now' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('no.exist');
      expect(data.likely_cause).toContain('Stream not found');
    }
  });
});

describe('computeQualityMetrics', () => {
  it('returns "good" when no degraded or failed', () => {
    const result = computeQualityMetrics({
      totalCount: 1000,
      degradedCount: 0,
      failedCount: 0,
    });
    expect(result.degradedPct).toBe(0);
    expect(result.failedPct).toBe(0);
    expect(result.quality).toBe('good');
  });

  it('returns "poor" when degraded percentage exceeds 3%', () => {
    const result = computeQualityMetrics({
      totalCount: 200,
      degradedCount: 20,
      failedCount: 0,
    });
    expect(result.degradedPct).toBe(10);
    expect(result.quality).toBe('poor');
  });

  it('returns "degraded" when degraded percentage is between 0% and 3%', () => {
    const result = computeQualityMetrics({
      totalCount: 1000,
      degradedCount: 10,
      failedCount: 0,
    });
    expect(result.degradedPct).toBe(1);
    expect(result.quality).toBe('degraded');
  });

  it('computes failed percentage with denominator = total + failed', () => {
    const result = computeQualityMetrics({
      totalCount: 100,
      degradedCount: 0,
      failedCount: 10,
    });
    const expectedFailedPct = (10 / 110) * 100;
    expect(result.failedPct).toBeCloseTo(expectedFailedPct);
    expect(result.quality).toBe('poor');
  });

  it('returns "poor" when failed percentage exceeds 3%', () => {
    const result = computeQualityMetrics({
      totalCount: 100,
      degradedCount: 0,
      failedCount: 5,
    });
    expect(result.failedPct).toBeCloseTo((5 / 105) * 100);
    expect(result.quality).toBe('poor');
  });

  it('returns "good" when totalCount is 0 and no failed', () => {
    const result = computeQualityMetrics({
      totalCount: 0,
      degradedCount: 0,
      failedCount: 0,
    });
    expect(result.degradedPct).toBe(0);
    expect(result.failedPct).toBe(0);
    expect(result.quality).toBe('good');
  });

  it('returns "poor" when all docs are degraded and failed', () => {
    const result = computeQualityMetrics({
      totalCount: 100,
      degradedCount: 100,
      failedCount: 100,
    });
    expect(result.quality).toBe('poor');
  });
});

describe('detectFailureStoreStatus', () => {
  it('returns "enabled" for enabled failure store', () => {
    const def = {
      name: 'logs',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: [],
        lifecycle: { inherit: {} },
        failure_store: { enabled: {} },
      },
    } as unknown as Streams.all.Definition;
    expect(detectFailureStoreStatus(def)).toBe('enabled');
  });

  it('returns "disabled" for disabled failure store', () => {
    const def = {
      name: 'logs',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: [],
        lifecycle: { inherit: {} },
        failure_store: { disabled: {} },
      },
    } as unknown as Streams.all.Definition;
    expect(detectFailureStoreStatus(def)).toBe('disabled');
  });

  it('returns "inherited" for inherit failure store', () => {
    const def = {
      name: 'logs',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: [],
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition;
    expect(detectFailureStoreStatus(def)).toBe('inherited');
  });

  it('returns "not_applicable" for query streams', () => {
    const def = {
      name: 'query.test',
      query: { esql: 'FROM logs' },
    } as unknown as Streams.all.Definition;
    expect(detectFailureStoreStatus(def)).toBe('not_applicable');
  });
});
