/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { ToolHandlerReturn } from '@kbn/agent-builder-server/tools/handler';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('@kbn/streams-ai', () => ({
  partitionStream: jest.fn(),
}));

import { partitionStream } from '@kbn/streams-ai';
import { createSuggestPartitionsTool } from './suggest_partitions';
import {
  createMockGetScopedClients,
  createMockToolContext,
  mockEsMethodResolvedValue,
} from '../../utils/test_helpers';

const mockPartitionStream = partitionStream as jest.MockedFunction<typeof partitionStream>;

// `ToolHandlerReturn` is a union of the prompt-shaped return and the
// results-shaped return. The suggest_partitions tool only ever takes the
// results path, so we narrow once and reuse it across assertions.
const firstResult = (result: ToolHandlerReturn) => {
  if (!('results' in result)) {
    throw new Error('Expected `results` on tool handler return, got prompt return');
  }
  return result.results[0];
};

const wiredStreamDef = (
  name: string,
  routing: Streams.WiredStream.Definition['ingest']['wired']['routing'] = []
): Streams.WiredStream.Definition => ({
  type: 'wired',
  name,
  description: '',
  updated_at: '2026-04-10T00:00:00.000Z',
  ingest: {
    wired: { fields: { 'log.level': { type: 'keyword' } }, routing },
    processing: { steps: [], updated_at: '2026-04-10T00:00:00.000Z' },
    lifecycle: { inherit: {} },
    failure_store: { inherit: {} },
    settings: {},
  },
});

const queryStreamDef = (name: string): Streams.QueryStream.Definition => ({
  type: 'query',
  name,
  description: '',
  updated_at: '2026-04-10T00:00:00.000Z',
  query: { view: name, esql: 'FROM logs* | LIMIT 1' },
});

const aggSearchResponse = (minTs: number | null, maxTs: number | null) =>
  ({
    took: 0,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { hits: [], total: { value: 0, relation: 'eq' } },
    aggregations: {
      min_ts: { value: minTs },
      max_ts: { value: maxTs },
    },
  } as const);

describe('createSuggestPartitionsTool', () => {
  // Older jest jsdom envs don't ship `AbortSignal.timeout`, but the suggest
  // partitions handler relies on it to compose an operation timeout signal
  // with the request signal. Polyfill it locally so the tests can exercise
  // the full handler path without hitting "AbortSignal.timeout is not a
  // function". Scoped to this suite (not the module top-level) so the
  // mutation never leaks beyond the file.
  beforeAll(() => {
    if (typeof AbortSignal.timeout !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (AbortSignal as any).timeout = (ms: number) => {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(new Error(`Timeout after ${ms}ms`)), ms).unref?.();
        return ctrl.signal;
      };
    }
  });

  const setup = () => {
    const { getScopedClients, streamsClient, esClient } = createMockGetScopedClients();

    // The tool retrieves features through `getFeatureClient` to enrich the
    // LLM context. We stub it minimally so the tool can wire the callback;
    // tests don't exercise the LLM path so the function never gets invoked.
    const featureClient = { getFeatures: jest.fn().mockResolvedValue({ hits: [] }) };
    (getScopedClients as jest.MockedFunction<typeof getScopedClients>).mockResolvedValue({
      streamsClient,
      scopedClusterClient: { asCurrentUser: esClient },
      getFeatureClient: jest.fn().mockResolvedValue(featureClient),
    } as never);

    const tool = createSuggestPartitionsTool({ getScopedClients, logger: loggerMock.create() });
    const context = createMockToolContext();
    return { tool, context, streamsClient, esClient, featureClient };
  };

  beforeEach(() => {
    mockPartitionStream.mockReset();
  });

  it('returns an `unsupported_stream_type` error for non-wired streams', async () => {
    // Classic and query streams cannot be partitioned via the wired routing
    // model — surfacing a typed error lets the agent fall back gracefully
    // without wasting LLM tokens on `partitionStream`.
    const { tool, context, streamsClient } = setup();
    streamsClient.getStream.mockResolvedValue(queryStreamDef('logs.errors-view'));

    const result = await tool.handler({ stream_name: 'logs.errors-view' }, context);

    if (!('results' in result)) throw new Error('Expected results');
    expect(result.results).toHaveLength(1);
    expect(firstResult(result).type).toBe(ToolResultType.error);
    expect(firstResult(result).data).toMatchObject({
      operation: 'suggest_partitions',
      likely_cause: 'unsupported_stream_type',
      stream: 'logs.errors-view',
    });
    expect(mockPartitionStream).not.toHaveBeenCalled();
  });

  it('returns `no_samples` when @timestamp aggregation has no values (empty stream)', async () => {
    // A freshly-forked stream with no documents yet must short-circuit before
    // the LLM workflow so the user sees the actual cause ("send some data
    // first") instead of an opaque "no_clusters" later in the flow.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.empty'));
    mockEsMethodResolvedValue(esClient.search, aggSearchResponse(null, null));

    const result = await tool.handler({ stream_name: 'logs.empty' }, context);

    if (!('results' in result)) throw new Error('Expected results');
    expect(result.results).toHaveLength(1);
    expect(firstResult(result).type).toBe(ToolResultType.other);
    expect(firstResult(result).data).toMatchObject({
      stream: 'logs.empty',
      partitions: [],
      existing_partitions: [],
      reason: 'no_samples',
      status: 'suggestion_not_applied',
    });
    expect(mockPartitionStream).not.toHaveBeenCalled();
  });

  it('lists existing enabled routes under `existing_partitions` and skips disabled ones', async () => {
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(
      wiredStreamDef('logs.parent', [
        {
          destination: 'logs.parent.checkout',
          where: { field: 'service.name', eq: 'checkout' },
          status: 'enabled',
        },
        {
          destination: 'logs.parent.legacy',
          where: { field: 'service.name', eq: 'legacy' },
          status: 'disabled',
        },
      ])
    );
    mockEsMethodResolvedValue(esClient.search, aggSearchResponse(null, null));

    const result = await tool.handler({ stream_name: 'logs.parent' }, context);

    expect(firstResult(result).data).toMatchObject({
      existing_partitions: [
        {
          name: 'logs.parent.checkout',
          condition: { field: 'service.name', eq: 'checkout' },
        },
      ],
    });
  });

  it('calls partitionStream with the discovered time range and returns its suggestions', async () => {
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.parent'));

    const maxTs = Date.now();
    const minTs = maxTs - 60 * 60_000; // 1 hour ago, well under the 7-day cap.
    mockEsMethodResolvedValue(esClient.search, aggSearchResponse(minTs, maxTs));

    mockPartitionStream.mockResolvedValue({
      partitions: [{ name: 'logs.parent.api', condition: { field: 'service.name', eq: 'api' } }],
    });

    const result = await tool.handler(
      { stream_name: 'logs.parent', user_prompt: 'split by service' },
      context
    );

    expect(mockPartitionStream).toHaveBeenCalledTimes(1);
    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({
        definition: expect.objectContaining({ name: 'logs.parent', type: 'wired' }),
        start: minTs,
        end: maxTs,
        userPrompt: 'split by service',
      })
    );

    expect(firstResult(result).type).toBe(ToolResultType.other);
    expect(firstResult(result).data).toMatchObject({
      stream: 'logs.parent',
      partitions: [{ name: 'logs.parent.api', condition: { field: 'service.name', eq: 'api' } }],
      time_range: { start: minTs, end: maxTs },
      status: 'suggestion_not_applied',
    });
  });

  it('caps the time range to the most recent 7 days for very long-lived streams', async () => {
    // The clustering step inside `partitionStream` is O(samples). Capping the
    // range protects against catastrophic costs on streams that have years
    // of history.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.long_lived'));

    const maxTs = Date.now();
    const minTs = maxTs - 30 * 24 * 60 * 60_000; // 30 days of history.
    mockEsMethodResolvedValue(esClient.search, aggSearchResponse(minTs, maxTs));

    mockPartitionStream.mockResolvedValue({ partitions: [] });

    await tool.handler({ stream_name: 'logs.long_lived' }, context);

    const expectedStart = maxTs - 7 * 24 * 60 * 60_000;
    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({ start: expectedStart, end: maxTs })
    );
  });

  it('uses a fallback window when min @timestamp equals max @timestamp', async () => {
    // A stream with a single document — or all docs ingested at the same ms —
    // would otherwise produce a zero-width range that the clustering step
    // cannot work with. The fallback widens the lookback to 24h.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.single_doc'));

    const ts = Date.now();
    mockEsMethodResolvedValue(esClient.search, aggSearchResponse(ts, ts));

    mockPartitionStream.mockResolvedValue({ partitions: [] });

    await tool.handler({ stream_name: 'logs.single_doc' }, context);

    const expectedFallbackStart = ts - 24 * 60 * 60_000;
    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({ start: expectedFallbackStart, end: ts })
    );
  });

  it('includes the workflow `reason` (e.g. no_clusters) in the result when present', async () => {
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.parent'));

    const maxTs = Date.now();
    mockEsMethodResolvedValue(esClient.search, aggSearchResponse(maxTs - 60_000, maxTs));

    mockPartitionStream.mockResolvedValue({ partitions: [], reason: 'no_clusters' });

    const result = await tool.handler({ stream_name: 'logs.parent' }, context);

    expect(firstResult(result).data).toMatchObject({
      partitions: [],
      reason: 'no_clusters',
    });
  });

  it('forwards `previous_suggestions` to the workflow as `existingPartitions`', async () => {
    // When the user asks for "different partitions", the agent passes the
    // previous proposals so the workflow avoids re-suggesting the same ones.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.parent'));

    const maxTs = Date.now();
    mockEsMethodResolvedValue(esClient.search, aggSearchResponse(maxTs - 60_000, maxTs));

    mockPartitionStream.mockResolvedValue({ partitions: [] });

    const previousSuggestions = [
      { name: 'logs.parent.foo', condition: { field: 'service.name', eq: 'foo' } },
    ];

    await tool.handler(
      { stream_name: 'logs.parent', previous_suggestions: previousSuggestions },
      context
    );

    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({ existingPartitions: previousSuggestions })
    );
  });

  it('wraps unexpected errors from partitionStream in a typed tool error', async () => {
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.parent'));

    const maxTs = Date.now();
    mockEsMethodResolvedValue(esClient.search, aggSearchResponse(maxTs - 60_000, maxTs));

    mockPartitionStream.mockRejectedValue(new Error('LLM connector unavailable'));

    const result = await tool.handler({ stream_name: 'logs.parent' }, context);

    expect(firstResult(result).type).toBe(ToolResultType.error);
    expect(firstResult(result).data).toMatchObject({
      operation: 'suggest_partitions',
      stream: 'logs.parent',
      message: expect.stringContaining('LLM connector unavailable'),
    });
  });
});
