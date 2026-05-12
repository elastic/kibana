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
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';

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

const SUFFICIENT_TOTAL = 500;
const MIN_SAMPLE_COUNT = 50;

const baseHttpFields = {
  took: 0,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
} as const;

/**
 * The discovery query runs first, with `track_total_hits: false`, and only
 * exposes the min/max @timestamp aggs. `null` values mean the unrouted pool
 * is empty, which collapses straight to the `no_samples` early-exit (the
 * count query is never sent in that case).
 */
const rangeSearchResponse = (minTs: number | null, maxTs: number | null) =>
  ({
    ...baseHttpFields,
    hits: { hits: [], total: { value: 0, relation: 'eq' as const } },
    aggregations: {
      min_ts: { value: minTs },
      max_ts: { value: maxTs },
    },
  } as const);

/**
 * The floor query runs second, scoped to the chosen window with
 * `track_total_hits: MIN_SAMPLE_COUNT`. We mirror the relation ES would
 * return so the tool's "below threshold" branch and the "ok" branch both
 * read the same shape they see in production.
 */
const countSearchResponse = (total: number) =>
  ({
    ...baseHttpFields,
    hits: {
      hits: [],
      total: {
        value: total,
        relation: total >= MIN_SAMPLE_COUNT ? ('gte' as const) : ('eq' as const),
      },
    },
  } as const);

/**
 * Wires both ES queries the tool sends in sequence (range discovery, then
 * the floor count). When the discovery returns null timestamps the tool
 * short-circuits and the count stub is never consumed — passing
 * `total: undefined` skips wiring the second response so the test fails
 * loudly if the short-circuit ever regresses into a second call.
 */
const mockTimeRangeSearches = (
  search: { mockResolvedValueOnce: Function },
  { minTs, maxTs, total }: { minTs: number | null; maxTs: number | null; total?: number }
) => {
  search.mockResolvedValueOnce(rangeSearchResponse(minTs, maxTs));
  if (typeof total === 'number') {
    search.mockResolvedValueOnce(countSearchResponse(total));
  }
};

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

  it('returns `no_samples` when the unrouted pool is empty (skips the floor count)', async () => {
    // A freshly-forked stream with no documents yet must short-circuit before
    // the LLM workflow so the user sees the actual cause ("send some data
    // first") instead of an opaque "no_clusters" later in the flow. Wire
    // *only* the discovery response — if the tool ever tries a second ES
    // call here the test fails loudly with "no more mock responses".
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.empty'));
    mockTimeRangeSearches(esClient.search, { minTs: null, maxTs: null });

    const result = await tool.handler({ stream_name: 'logs.empty' }, context);

    expect(esClient.search).toHaveBeenCalledTimes(1);
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

  it('returns `insufficient_samples` when the chosen window holds fewer than MIN_SAMPLE_COUNT docs (#20)', async () => {
    // Below-floor pools waste an LLM call: the clustering step has too little
    // signal and ends up returning brittle, low-confidence partitions. The
    // typed reason lets the agent pivot to manual `create_partition` instead
    // of presenting weak proposals.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.thin'));
    const maxTs = Date.now();
    mockTimeRangeSearches(esClient.search, { minTs: maxTs - 60_000, maxTs, total: 12 });

    const result = await tool.handler({ stream_name: 'logs.thin' }, context);

    expect(firstResult(result).type).toBe(ToolResultType.other);
    expect(firstResult(result).data).toMatchObject({
      stream: 'logs.thin',
      partitions: [],
      reason: 'insufficient_samples',
      sample_count: 12,
      minimum_required: MIN_SAMPLE_COUNT,
      status: 'suggestion_not_applied',
    });
    expect(mockPartitionStream).not.toHaveBeenCalled();
  });

  it('excludes enabled child-route conditions from BOTH discovery and floor queries (#19)', async () => {
    // Without these exclusions the discovered window and the floor count
    // would reflect routed-away docs, dominating streams where most traffic
    // is already partitioned and leaving the workflow with an effectively
    // empty clusterable pool. Disabled routes are intentionally ignored —
    // they don't affect ingest routing and must not skew the sample pool.
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
    const maxTs = Date.now();
    mockTimeRangeSearches(esClient.search, {
      minTs: maxTs - 60_000,
      maxTs,
      total: SUFFICIENT_TOTAL,
    });
    mockPartitionStream.mockResolvedValue({ partitions: [] });

    await tool.handler({ stream_name: 'logs.parent' }, context);

    expect(esClient.search).toHaveBeenCalledTimes(2);

    const [discoveryArgs, countArgs] = (esClient.search as unknown as jest.Mock).mock.calls.map(
      (call) => call[0]
    );

    // Discovery: exclusions only, no time bound — anchors the window at the
    // actual data extent regardless of recency (dormant-stream support).
    expect(discoveryArgs.track_total_hits).toBe(false);
    expect(discoveryArgs.query.bool.must_not).toHaveLength(1);
    expect(discoveryArgs.query.bool.filter).toBeUndefined();

    // Floor count: same exclusions, plus the chosen window, plus the floor.
    expect(countArgs.track_total_hits).toBe(MIN_SAMPLE_COUNT);
    expect(countArgs.query.bool.must_not).toHaveLength(1);
    expect(countArgs.query.bool.filter[0].range['@timestamp']).toBeDefined();
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
    // Empty pool short-circuits before the count query but still surfaces
    // the existing-routes list.
    mockTimeRangeSearches(esClient.search, { minTs: null, maxTs: null });

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
    const minTs = maxTs - 2 * 24 * 60 * 60_000;
    mockTimeRangeSearches(esClient.search, { minTs, maxTs, total: SUFFICIENT_TOTAL });

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

  it('caps the window WIDTH at 7 days while anchoring at maxTs (long-lived streams)', async () => {
    // The clustering step inside `partitionStream` is O(samples). Capping
    // the range protects against catastrophic costs on streams that have
    // years of history; we anchor the cap at maxTs (not `now`) so the
    // logic also works when the most recent data is itself old.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.long_lived'));

    const maxTs = Date.now();
    const minTs = maxTs - 30 * 24 * 60 * 60_000;
    mockTimeRangeSearches(esClient.search, { minTs, maxTs, total: SUFFICIENT_TOTAL });

    mockPartitionStream.mockResolvedValue({ partitions: [] });

    await tool.handler({ stream_name: 'logs.long_lived' }, context);

    const expectedStart = maxTs - 7 * 24 * 60 * 60_000;
    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({ start: expectedStart, end: maxTs })
    );
  });

  it('clusters dormant streams (maxTs weeks ago) on their tail data instead of reporting empty', async () => {
    // Regression guard for the discovery query design: if the discovery
    // ever filters by wall-clock `now - 7d`, dormant streams collapse to
    // `no_samples` even though they have perfectly clusterable data
    // older than a week. Anchoring at maxTs avoids that.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.dormant'));

    const maxTs = Date.now() - 30 * 24 * 60 * 60_000; // last activity 30d ago
    const minTs = maxTs - 60 * 24 * 60 * 60_000; // 60d of history before that
    mockTimeRangeSearches(esClient.search, { minTs, maxTs, total: SUFFICIENT_TOTAL });

    mockPartitionStream.mockResolvedValue({ partitions: [] });

    await tool.handler({ stream_name: 'logs.dormant' }, context);

    const expectedStart = maxTs - 7 * 24 * 60 * 60_000;
    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({ start: expectedStart, end: maxTs })
    );

    // The floor query also has to use the chosen window (not `now`),
    // otherwise it would count zero docs and incorrectly trip
    // `insufficient_samples`.
    const countArgs = (esClient.search as unknown as jest.Mock).mock.calls[1][0];
    expect(countArgs.query.bool.filter[0].range['@timestamp']).toMatchObject({
      gte: expectedStart,
      lte: maxTs,
    });
  });

  it('widens to the 24h fallback only when min @timestamp equals max @timestamp', async () => {
    // A stream with a single document — or all docs ingested at the same ms —
    // would otherwise produce a zero-width range that downstream sampling
    // cannot work with. Multi-doc but narrow windows (e.g. a 60s burst) are
    // intentionally NOT widened: clustering cares about doc count and
    // content patterns, not absolute width.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.single_doc'));

    const ts = Date.now();
    mockTimeRangeSearches(esClient.search, { minTs: ts, maxTs: ts, total: SUFFICIENT_TOTAL });

    mockPartitionStream.mockResolvedValue({ partitions: [] });

    await tool.handler({ stream_name: 'logs.single_doc' }, context);

    const expectedFallbackStart = ts - 24 * 60 * 60_000;
    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({ start: expectedFallbackStart, end: ts })
    );
  });

  it('does NOT widen non-degenerate narrow windows (e.g. 60-second bursts)', async () => {
    // Pinned: clustering on a 60s burst of 500 docs is fine; widening to
    // 24h would either silently include docs outside the burst (skewing
    // the count) or bring nothing new in. The previous over-eager widening
    // logic is what this test guards against regressing.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.burst'));
    const maxTs = Date.now();
    const minTs = maxTs - 60_000;
    mockTimeRangeSearches(esClient.search, { minTs, maxTs, total: SUFFICIENT_TOTAL });
    mockPartitionStream.mockResolvedValue({ partitions: [] });

    await tool.handler({ stream_name: 'logs.burst' }, context);

    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({ start: minTs, end: maxTs })
    );
  });

  it('includes the workflow `reason` (e.g. no_clusters) in the result when present', async () => {
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.parent'));

    const maxTs = Date.now();
    mockTimeRangeSearches(esClient.search, {
      minTs: maxTs - 60_000,
      maxTs,
      total: SUFFICIENT_TOTAL,
    });

    mockPartitionStream.mockResolvedValue({ partitions: [], reason: 'no_clusters' });

    const result = await tool.handler({ stream_name: 'logs.parent' }, context);

    expect(firstResult(result).data).toMatchObject({
      partitions: [],
      reason: 'no_clusters',
    });
  });

  it('forwards `previous_suggestions` to the workflow under the same name', async () => {
    // When the user asks for "different partitions", the agent passes the
    // previous proposals so the workflow can refine or replace them.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.parent'));

    const maxTs = Date.now();
    mockTimeRangeSearches(esClient.search, {
      minTs: maxTs - 60_000,
      maxTs,
      total: SUFFICIENT_TOTAL,
    });

    mockPartitionStream.mockResolvedValue({ partitions: [] });

    const previousSuggestions = [
      { name: 'logs.parent.foo', condition: { field: 'service.name', eq: 'foo' } },
    ];

    await tool.handler(
      { stream_name: 'logs.parent', previous_suggestions: previousSuggestions },
      context
    );

    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({ previousSuggestions })
    );
  });

  it('drops `previous_suggestions` whose names collide with real existing routes (#16)', async () => {
    // A real disk-stored route under the same name means the suggestion was
    // already applied somewhere in the conversation; passing it back to the
    // workflow would either no-op (the workflow excludes matching docs) or
    // confuse the LLM into proposing a duplicate. The tool drops the
    // collisions, forwards the rest, and reports the dropped names so the
    // agent can correct the user.
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(
      wiredStreamDef('logs.parent', [
        {
          destination: 'logs.parent.checkout',
          where: { field: 'service.name', eq: 'checkout' },
          status: 'enabled',
        },
      ])
    );
    const maxTs = Date.now();
    mockTimeRangeSearches(esClient.search, {
      minTs: maxTs - 60_000,
      maxTs,
      total: SUFFICIENT_TOTAL,
    });
    mockPartitionStream.mockResolvedValue({ partitions: [] });

    const result = await tool.handler(
      {
        stream_name: 'logs.parent',
        previous_suggestions: [
          { name: 'logs.parent.checkout', condition: { field: 'service.name', eq: 'checkout' } },
          { name: 'logs.parent.api', condition: { field: 'service.name', eq: 'api' } },
        ],
      },
      context
    );

    expect(mockPartitionStream).toHaveBeenCalledWith(
      expect.objectContaining({
        previousSuggestions: [
          { name: 'logs.parent.api', condition: { field: 'service.name', eq: 'api' } },
        ],
      })
    );
    expect(firstResult(result).data).toMatchObject({
      previous_suggestions_dropped: ['logs.parent.checkout'],
    });
  });

  it('wraps unexpected errors from partitionStream in a typed tool error', async () => {
    const { tool, context, streamsClient, esClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.parent'));

    const maxTs = Date.now();
    mockTimeRangeSearches(esClient.search, {
      minTs: maxTs - 60_000,
      maxTs,
      total: SUFFICIENT_TOTAL,
    });

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
