/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  formatBytes,
  buildRetentionInfo,
  createGetLifecycleStatsTool,
} from './get_lifecycle_stats';
import { createMockGetScopedClients, createMockToolContext } from './test_helpers';

jest.mock('../../lib/streams/lifecycle/get_effective_lifecycle', () => ({
  getEffectiveLifecycle: jest.fn(),
}));

jest.mock('../../lib/streams/lifecycle/ilm_phases', () => ({
  ilmPhases: jest.fn(),
}));

const { getEffectiveLifecycle } = jest.requireMock(
  '../../lib/streams/lifecycle/get_effective_lifecycle'
);
const { ilmPhases } = jest.requireMock('../../lib/streams/lifecycle/ilm_phases');

describe('createGetLifecycleStatsTool handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockIngestDefinition = {
    name: 'logs',
    ingest: {
      wired: { fields: {}, routing: [] },
      processing: [],
      lifecycle: { dsl: { data_retention: '7d' } },
      failure_store: { inherit: {} },
    },
  } as unknown as Streams.all.Definition;

  const mockStatsResponse = (overrides: Partial<IndicesStatsResponse> = {}) =>
    ({
      _all: { primaries: { store: { size_in_bytes: 1024 }, docs: { count: 500 } } },
      indices: {},
      ...overrides,
    } as unknown as IndicesStatsResponse);

  const setup = () => {
    const { getScopedClients, streamsClient, esClient } = createMockGetScopedClients();
    const tool = createGetLifecycleStatsTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, streamsClient, esClient };
  };

  it('returns DSL lifecycle stats', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    streamsClient.getStream.mockResolvedValue(mockIngestDefinition);
    streamsClient.getDataStream.mockResolvedValue({ name: 'logs' } as unknown as ReturnType<
      typeof streamsClient.getDataStream
    > extends Promise<infer T>
      ? T
      : never);

    getEffectiveLifecycle.mockResolvedValue({ dsl: { data_retention: '7d' } });
    esClient.indices.stats.mockResolvedValue(mockStatsResponse());

    const result = await tool.handler({ name: 'logs' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.stream).toBe('logs');
      expect(data.retention).toEqual({ type: 'dsl', data_retention: '7d' });
      expect(data.storage_size_bytes).toBe(1024);
      expect(data.storage_size_human).toBe('1 KB');
      expect(data.document_count).toBe(500);
    }
  });

  it('returns ILM lifecycle with phases', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    const ilmDefinition = {
      name: 'logs',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: [],
        lifecycle: { ilm: { policy: 'my_policy' } },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition;

    streamsClient.getStream.mockResolvedValue(ilmDefinition);
    streamsClient.getDataStream.mockResolvedValue({
      name: 'logs',
    } as unknown as Awaited<ReturnType<typeof streamsClient.getDataStream>>);

    getEffectiveLifecycle.mockResolvedValue({ ilm: { policy: 'my_policy' } });

    esClient.indices.stats.mockResolvedValue(
      mockStatsResponse({
        _all: { primaries: { store: { size_in_bytes: 2048 }, docs: { count: 100 } } },
        indices: { 'logs-000001': {} },
      } as unknown as IndicesStatsResponse)
    );

    esClient.ilm.getLifecycle.mockResolvedValue({
      my_policy: { policy: { phases: { hot: {} } } },
    } as unknown as Awaited<ReturnType<typeof esClient.ilm.getLifecycle>>);

    esClient.ilm.explainLifecycle.mockResolvedValue({
      indices: {},
    } as unknown as Awaited<ReturnType<typeof esClient.ilm.explainLifecycle>>);

    const mockPhases = { hot: { name: 'hot', size_in_bytes: 2048 } };
    ilmPhases.mockReturnValue(mockPhases);

    const result = await tool.handler({ name: 'logs' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.retention).toEqual({ type: 'ilm', policy_name: 'my_policy' });
      expect(data.ilm_phases).toEqual(mockPhases);
    }
  });

  it('returns early for query streams', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'query.test',
      query: { esql: 'FROM logs' },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler({ name: 'query.test' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.type).toBe('query');
      expect(data.message).toContain('only available for ingest streams');
    }
  });

  it('calls indices.stats only once (reuses for ILM enrichment)', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    const ilmDef = {
      name: 'logs',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: [],
        lifecycle: { ilm: { policy: 'p' } },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition;

    streamsClient.getStream.mockResolvedValue(ilmDef);
    streamsClient.getDataStream.mockResolvedValue({
      name: 'logs',
    } as unknown as Awaited<ReturnType<typeof streamsClient.getDataStream>>);
    getEffectiveLifecycle.mockResolvedValue({ ilm: { policy: 'p' } });

    esClient.indices.stats.mockResolvedValue(
      mockStatsResponse({
        _all: { primaries: { store: { size_in_bytes: 0 }, docs: { count: 0 } } },
      } as unknown as IndicesStatsResponse)
    );

    esClient.ilm.getLifecycle.mockResolvedValue({
      p: { policy: { phases: {} } },
    } as unknown as Awaited<ReturnType<typeof esClient.ilm.getLifecycle>>);

    esClient.ilm.explainLifecycle.mockResolvedValue({
      indices: {},
    } as unknown as Awaited<ReturnType<typeof esClient.ilm.explainLifecycle>>);
    ilmPhases.mockReturnValue({});

    await tool.handler({ name: 'logs' }, context);

    expect(esClient.indices.stats).toHaveBeenCalledTimes(1);
  });

  it('returns error for not-found stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockRejectedValue(
      Object.assign(new Error('Cannot find stream'), { statusCode: 404 })
    );

    const result = await tool.handler({ name: 'no.exist' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('no.exist');
      expect(data.likely_cause).toContain('Stream not found');
    }
  });
});

describe('formatBytes', () => {
  it('returns "0 B" for 0', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('returns "1 KB" for 1024', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('handles large values', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('rounds to two decimal places', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('returns "0 B" for negative values', () => {
    expect(formatBytes(-100)).toBe('0 B');
  });

  it('returns "0 B" for NaN', () => {
    expect(formatBytes(NaN)).toBe('0 B');
  });

  it('returns "0 B" for Infinity', () => {
    expect(formatBytes(Infinity)).toBe('0 B');
  });
});

describe('buildRetentionInfo', () => {
  it('returns ILM type with policy_name', () => {
    const lifecycle = { ilm: { policy: 'my_policy' } } as IngestStreamEffectiveLifecycle;
    const result = buildRetentionInfo(lifecycle);
    expect(result.type).toBe('ilm');
    expect(result.policy_name).toBe('my_policy');
  });

  it('returns DSL type with data_retention', () => {
    const lifecycle = {
      dsl: { data_retention: '30d' },
    } as IngestStreamEffectiveLifecycle;
    const result = buildRetentionInfo(lifecycle);
    expect(result.type).toBe('dsl');
    expect(result.data_retention).toBe('30d');
  });

  it('returns DSL type with "indefinite" when no retention set', () => {
    const lifecycle = { dsl: {} } as IngestStreamEffectiveLifecycle;
    const result = buildRetentionInfo(lifecycle);
    expect(result.type).toBe('dsl');
    expect(result.data_retention).toBe('indefinite');
  });

  it('returns inherited type', () => {
    const lifecycle = { inherit: {} } as IngestStreamEffectiveLifecycle;
    const result = buildRetentionInfo(lifecycle);
    expect(result.type).toBe('inherited');
  });
});
