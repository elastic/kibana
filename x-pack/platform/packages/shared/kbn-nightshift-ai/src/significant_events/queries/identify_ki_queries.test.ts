/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  BoundInferenceClient,
  ChatCompletionTokenCount,
  ToolCallback,
} from '@kbn/inference-common';
import type { Feature } from '@kbn/significant-events-schema';
import type { AnalysisTarget } from '../../shared/analysis_target';

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeAsReasoningAgent: jest.fn(),
}));

import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import {
  computeValidationLookback,
  identifyKIQueries,
  type ExistingQuerySummary,
} from './identify_ki_queries';

const executeAsReasoningAgentMock = executeAsReasoningAgent as jest.MockedFunction<
  typeof executeAsReasoningAgent
>;

const createEsClient = () => {
  const query = jest.fn();

  return {
    esClient: { esql: { query } } as unknown as ElasticsearchClient,
    query,
  };
};

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
} as unknown as Logger;

const countResponse = (total: number) => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[total]],
});

const signal = new AbortController().signal;

describe('computeValidationLookback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('probes with a STATS COUNT(*) query scoped to the probe window', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(1_000_000));

    await computeValidationLookback({
      esClient,
      sources: ['$.cars.electric'],
      signal,
      logger,
    });

    expect(query).toHaveBeenCalledWith(
      {
        query: 'FROM $.cars.electric | STATS total = COUNT(*)',
        filter: {
          range: {
            '@timestamp': {
              gte: 'now-10m',
              lte: 'now',
            },
          },
        },
      },
      { signal, requestTimeout: 5_000 }
    );
  });

  it('joins multiple sources into a single FROM clause', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(0));

    await computeValidationLookback({
      esClient,
      sources: ['logs-a', 'logs-a.*'],
      signal,
      logger,
    });

    expect(query.mock.calls[0][0].query).toBe('FROM logs-a, logs-a.* | STATS total = COUNT(*)');
  });

  it('keeps a narrow window for a dense stream', async () => {
    const { esClient, query } = createEsClient();
    // 100k docs in the 10m probe window => rate already meets the target budget.
    query.mockResolvedValueOnce(countResponse(100_000));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10m');
  });

  it('widens the window for a sparse stream', async () => {
    const { esClient, query } = createEsClient();
    // 100 docs / 10m => rate of 10/min; target of 100_000 docs needs 10_000 minutes.
    query.mockResolvedValueOnce(countResponse(100));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10000m');
  });

  it('caps the widened window for a near-empty stream', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(0));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10080m');
  });

  it('falls back to the probe window when the probe itself fails', async () => {
    const { esClient, query } = createEsClient();
    query.mockRejectedValueOnce(new Error('Request timed out'));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10m');
    expect(logger.debug).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// identifyKIQueries agent harness
// ---------------------------------------------------------------------------

const inferenceClient = {} as BoundInferenceClient;

const target: AnalysisTarget = {
  id: 'logs',
  name: 'logs',
  description: 'A test stream',
  sources: ['logs', 'logs.*'],
  samplingSource: 'logs',
};

const callTool = (
  callback: ToolCallback,
  name: string,
  args: Record<string, unknown>
): ReturnType<ToolCallback> =>
  callback({
    toolCallId: `call-${name}`,
    function: {
      name,
      arguments: args,
    },
  });

const createReasoningResponse = (
  tokens: ChatCompletionTokenCount = { prompt: 100, completion: 50, total: 150, cached: 0 }
) =>
  ({
    content: '',
    toolCalls: [],
    tokens,
    diagnostics: { externalContentToolContinuations: 0 },
  } as unknown as Awaited<ReturnType<typeof executeAsReasoningAgent>>);

interface HarnessOptions {
  requireQueryIntent?: boolean;
  collectQueryAttempts?: boolean;
  existingQueries?: ExistingQuerySummary[];
  maxExistingQueriesForContext?: number;
  /** Overrides the target, so tests can reproduce the eval's wildcard stream name. */
  target?: AnalysisTarget;
  /** Each array of query payloads is issued as its own `add_queries` call. */
  scriptedAddQueries?: Array<Array<Record<string, unknown>>>;
  callGetStreamFeatures?: boolean;
  features?: Feature[];
  /** When set, `get_stream_features` rejects with this error. */
  getFeaturesError?: Error;
  /** Wall-clock budget forwarded to the reasoning agent. */
  maxDurationMs?: number;
  /** Overrides the ES client, so tests can script probe/validation responses. */
  esClient?: ElasticsearchClient;
}

const scriptedQuery = (
  esql: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  esql,
  title: `Title: ${esql}`,
  description: 'Detects the condition',
  category: 'error',
  severity_score: 50,
  feature_ids: ['feat-1'],
  ...overrides,
});

const runIdentifyKIQueries = async (options: HarnessOptions = {}) => {
  const getFeatures = jest.fn(async () => {
    if (options.getFeaturesError) {
      throw options.getFeaturesError;
    }
    return (options.features ?? [
      { id: 'feat-1', type: 'entity', title: 'Service A', description: 'A service' },
    ]) as Feature[];
  });

  const toolResponses: unknown[] = [];
  const addQueriesResponses: unknown[] = [];
  let capturedOptions: Parameters<typeof executeAsReasoningAgent>[0] | undefined;

  executeAsReasoningAgentMock.mockImplementation(async (opts) => {
    capturedOptions = opts as Parameters<typeof executeAsReasoningAgent>[0];
    if (options.callGetStreamFeatures !== false) {
      toolResponses.push(
        await callTool(capturedOptions.toolCallbacks.get_stream_features, 'get_stream_features', {})
      );
    }
    for (const queries of options.scriptedAddQueries ?? []) {
      toolResponses.push(
        await callTool(capturedOptions.toolCallbacks.add_queries, 'add_queries', { queries })
      );
      addQueriesResponses.push(toolResponses[toolResponses.length - 1]);
    }
    return createReasoningResponse();
  });

  const result = await identifyKIQueries({
    target: options.target ?? target,
    esClient: options.esClient ?? createEsClient().esClient,
    getFeatures,
    inferenceClient,
    signal,
    logger,
    systemPrompt: 'system prompt',
    requireQueryIntent: options.requireQueryIntent,
    collectQueryAttempts: options.collectQueryAttempts,
    existingQueries: options.existingQueries,
    maxExistingQueriesForContext: options.maxExistingQueriesForContext,
    maxDurationMs: options.maxDurationMs,
  });

  return {
    result,
    capturedOptions: () => capturedOptions,
    toolResponses,
    addQueriesResponses,
  };
};

const addQueriesSchema = (captured: Parameters<typeof executeAsReasoningAgent>[0] | undefined) => {
  const tools = captured?.prompt.versions[0]?.tools as Record<string, { schema?: unknown }>;
  return tools?.add_queries?.schema as {
    properties: { queries: { items: { properties: Record<string, unknown>; required: string[] } } };
  };
};

describe('identifyKIQueries agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('eval-only intent contract', () => {
    it('production mode leaves the tool schema and queries unchanged', async () => {
      const { result, capturedOptions, addQueriesResponses } = await runIdentifyKIQueries({
        scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "x"')]],
      });

      const schema = addQueriesSchema(capturedOptions());
      expect(schema.properties.queries.items.properties.expects_matches).toBeUndefined();
      expect(schema.properties.queries.items.required).not.toContain('expects_matches');

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].expects_matches).toBeUndefined();
      expect(result.queryAttempts).toBeUndefined();

      const addQueriesResponse = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string }> };
      };
      expect(addQueriesResponse.response.queries[0].status).toBe('Added');
    });

    it('eval mode advertises expects_matches but never makes it required', async () => {
      const { capturedOptions } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        scriptedAddQueries: [[]],
      });

      const schema = addQueriesSchema(capturedOptions());
      expect(schema.properties.queries.items.properties.expects_matches).toEqual({
        type: 'boolean',
        description: expect.any(String),
      });
      expect(schema.properties.queries.items.required).not.toContain('expects_matches');
    });

    it('does not count an intent-only rejection as an add_queries tool failure', async () => {
      // requireQueryIntent is eval-only, so charging tool_usage for it would make the eval-arm
      // score incomparable to production, where the rule does not exist.
      const { result } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        collectQueryAttempts: true,
        scriptedAddQueries: [
          [scriptedQuery('FROM logs | WHERE message == "a"', { expects_matches: undefined })],
        ],
      });

      expect(result.toolUsage.add_queries.calls).toBe(1);
      expect(result.toolUsage.add_queries.failures).toBe(0);
      // The omission is still observable, just not as a tool failure.
      expect(result.queryAttempts?.[0]).toMatchObject({ failureReason: 'missing_intent' });
    });

    it('still counts a genuine failure alongside an intent-only rejection', async () => {
      const { result } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        collectQueryAttempts: true,
        scriptedAddQueries: [
          [
            scriptedQuery('FROM logs | WHERE message == "a"', { expects_matches: undefined }),
            // Unknown feature_ids is a real tool-usage fault and must survive the split.
            scriptedQuery('FROM logs | WHERE message == "b"', {
              expects_matches: true,
              feature_ids: ['nope'],
            }),
          ],
        ],
      });

      expect(result.toolUsage.add_queries.failures).toBe(1);
      expect(result.queryAttempts?.map((a) => a.failureReason)).toEqual([
        'missing_intent',
        'unknown_features',
      ]);
    });

    it('soft-fails a missing intent item while retaining a valid sibling', async () => {
      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        collectQueryAttempts: true,
        scriptedAddQueries: [
          [
            scriptedQuery('FROM logs | WHERE message == "missing"', { expects_matches: undefined }),
            scriptedQuery('FROM logs | WHERE message == "ok"', { expects_matches: true }),
          ],
        ],
      });

      const addQueriesResponse = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string; error?: string }> };
      };
      expect(addQueriesResponse.response.queries[0].status).toBe('Failed to add');
      expect(addQueriesResponse.response.queries[0].error).toContain('expects_matches');
      expect(addQueriesResponse.response.queries[1].status).toBe('Added');

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].title).toContain('"ok"');
      expect(result.queries[0].expects_matches).toBe(true);

      expect(result.queryAttempts).toHaveLength(2);
      expect(result.queryAttempts?.[0]).toMatchObject({
        status: 'Failed to add',
        title: expect.stringContaining('"missing"'),
      });
      expect(result.queryAttempts?.[1]).toMatchObject({ status: 'Added' });
    });

    it('accepts a repaired intent in a later add_queries call and preserves the value', async () => {
      const { result } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        collectQueryAttempts: true,
        scriptedAddQueries: [
          [scriptedQuery('FROM logs | WHERE message == "dup"', { expects_matches: undefined })],
          [
            scriptedQuery('FROM logs | WHERE message == "dup"', { expects_matches: false }),
            scriptedQuery('FROM logs | WHERE message == "new"', { expects_matches: true }),
          ],
        ],
      });

      expect(result.queries).toHaveLength(2);
      expect(result.queries[0].expects_matches).toBe(false);
      expect(result.queries[1].expects_matches).toBe(true);
      expect(result.queryAttempts?.map((attempt) => attempt.status)).toEqual([
        'Failed to add',
        'Added',
        'Added',
      ]);
    });
  });

  describe('query attempt diagnostics', () => {
    it('forwards maxDurationMs to the reasoning agent', async () => {
      const { capturedOptions } = await runIdentifyKIQueries({
        maxDurationMs: 300000,
        scriptedAddQueries: [],
      });

      expect(capturedOptions()?.maxDurationMs).toBe(300000);
    });

    it('collects every attempt across multiple add_queries calls in order', async () => {
      const { result } = await runIdentifyKIQueries({
        collectQueryAttempts: true,
        scriptedAddQueries: [
          [
            scriptedQuery('FROM logs | WHERE message == "a"'),
            scriptedQuery('FROM logs | WHERE message == "b"'),
          ],
          [scriptedQuery('FROM logs | WHERE message == "c"')],
        ],
      });

      expect(result.queryAttempts?.map((attempt) => attempt.title)).toEqual([
        expect.stringContaining('"a"'),
        expect.stringContaining('"b"'),
        expect.stringContaining('"c"'),
      ]);
      expect(result.queryAttempts?.every((attempt) => attempt.status === 'Added')).toBe(true);
    });

    it('omits queryAttempts when collection is disabled', async () => {
      const { result } = await runIdentifyKIQueries({
        scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "a"')]],
      });

      expect(result.queries).toHaveLength(1);
      expect(result.queryAttempts).toBeUndefined();
    });

    it('exposes token counts reported by the reasoning agent', async () => {
      const { result } = await runIdentifyKIQueries({
        scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "a"')]],
      });

      expect(result.tokensUsed).toEqual({
        prompt: 100,
        completion: 50,
        total: 150,
        cached: 0,
      });
    });
  });

  describe('existing query context and exact dedup', () => {
    const seedQuery = (i: number): ExistingQuerySummary => ({
      id: `seed-${i}`,
      title: `Seed ${i}`,
      type: 'match',
      severity_score: i,
      description: `Seed query ${i}`,
      esql: `FROM logs, logs.* | WHERE message == "seed-${i}"`,
    });

    it('sorts by severity and slices the prompt context to maxExistingQueriesForContext', async () => {
      const existingQueries = Array.from({ length: 60 }, (_, i) => seedQuery(i));
      const { capturedOptions } = await runIdentifyKIQueries({
        existingQueries,
        maxExistingQueriesForContext: 50,
        scriptedAddQueries: [[]],
      });

      const context = JSON.parse(capturedOptions()?.input.existing_queries ?? '[]') as Array<{
        severity_score: number;
      }>;
      expect(context).toHaveLength(50);
      // Highest severity first.
      expect(context[0].severity_score).toBe(59);
      expect(context[49].severity_score).toBe(10);
    });

    it('rejects an exact duplicate even when its seed was outside the model context', async () => {
      // 60 seeds sorted by severity; the duplicate target has severity 1 and is
      // sliced out of the 50-item context, but full-list dedup must still catch it.
      const existingQueries = Array.from({ length: 60 }, (_, i) => seedQuery(i));
      const targeted = seedQuery(1);
      existingQueries[1] = {
        ...targeted,
        esql: 'FROM logs, logs.* | WHERE message == "dup"',
      };

      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        collectQueryAttempts: true,
        existingQueries,
        maxExistingQueriesForContext: 50,
        scriptedAddQueries: [
          [scriptedQuery('FROM logs | WHERE message == "dup"', { expects_matches: true })],
        ],
      });

      const addQueriesResponse = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string }> };
      };
      expect(addQueriesResponse.response.queries[0].status).toBe('Duplicate');
      expect(result.queries).toHaveLength(0);
      expect(result.queryAttempts?.[0]).toMatchObject({
        status: 'Duplicate',
        exactDuplicate: true,
      });
    });

    it('rejects a duplicate when the seed FROM differs from the stream sources', async () => {
      // Mirrors the eval: the stream name is a wildcard and seeds are authored un-rewritten, so
      // the candidate's FROM is rewritten to `logs*, logs*.*` while the seed says `logs`.
      const wildcardTarget: AnalysisTarget = {
        id: 'logs*',
        name: 'logs*',
        description: 'A test stream',
        sources: ['logs*', 'logs*.*'],
        samplingSource: 'logs*',
      };

      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        target: wildcardTarget,
        requireQueryIntent: true,
        collectQueryAttempts: true,
        existingQueries: [
          {
            id: 'seed-jdbc',
            title: 'JDBC connection failure',
            type: 'match',
            severity_score: 80,
            description: 'Seeded, authored against the bare stream name',
            esql: 'FROM logs | WHERE message == "dup"',
          },
        ],
        scriptedAddQueries: [
          [scriptedQuery('FROM logs | WHERE message == "dup"', { expects_matches: true })],
        ],
      });

      const addQueriesResponse = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string }> };
      };
      expect(addQueriesResponse.response.queries[0].status).toBe('Duplicate');
      expect(result.queries).toHaveLength(0);
      expect(result.queryAttempts?.[0]).toMatchObject({
        status: 'Duplicate',
        exactDuplicate: true,
      });
    });

    it('reports exactDuplicate even when an earlier gate rejects the attempt first', async () => {
      // `status` is first-failure-wins, so a duplicate that also omits intent surfaces as
      // 'Failed to add'. `exactDuplicate` must still identify it as a duplicate.
      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        collectQueryAttempts: true,
        existingQueries: [
          {
            id: 'seed-dup',
            title: 'Seeded',
            type: 'match',
            severity_score: 50,
            description: 'Seeded query',
            esql: 'FROM logs, logs.* | WHERE message == "dup"',
          },
        ],
        scriptedAddQueries: [
          // No expects_matches, so the intent gate claims it before dedup runs.
          [scriptedQuery('FROM logs | WHERE message == "dup"', { expects_matches: undefined })],
        ],
      });

      const addQueriesResponse = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string }> };
      };
      expect(addQueriesResponse.response.queries[0].status).toBe('Failed to add');
      expect(result.queries).toHaveLength(0);
      expect(result.queryAttempts?.[0]).toMatchObject({
        status: 'Failed to add',
        failureReason: 'missing_intent',
        exactDuplicate: true,
      });
    });

    it('does not compute exactDuplicate when attempts are not collected', async () => {
      const { result } = await runIdentifyKIQueries({
        existingQueries: [
          {
            id: 'seed-dup',
            title: 'Seeded',
            type: 'match',
            severity_score: 50,
            description: 'Seeded query',
            esql: 'FROM logs, logs.* | WHERE message == "dup"',
          },
        ],
        scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "dup"')]],
      });

      expect(result.queryAttempts).toBeUndefined();
    });
  });

  describe('over-broad full-text predicate rejection', () => {
    it('rejects a multi-word `:` value and asks for a rewrite', async () => {
      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message : "request failed"')]],
      });

      expect(result.queries).toHaveLength(0);

      const response = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string; failureReason?: string; error?: string }> };
      };
      const [rejected] = response.response.queries;
      expect(rejected.status).toBe('Failed to add');
      expect(rejected.failureReason).toBe('validation_error');
      expect(rejected.error).toContain('MATCH_PHRASE');
    });

    it('admits the AND-of-single-terms and MATCH_PHRASE rewrites', async () => {
      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        scriptedAddQueries: [
          [
            scriptedQuery('FROM logs | WHERE message:"request" AND message:"failed"'),
            scriptedQuery('FROM logs | WHERE MATCH_PHRASE(message, "request failed")'),
          ],
        ],
      });

      expect(result.queries).toHaveLength(2);

      const response = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string }> };
      };
      expect(response.response.queries.map((q) => q.status)).toEqual(['Added', 'Added']);
    });
  });

  describe('mapping-conflict-aware validation', () => {
    // One mock routes all ES calls by query text: STATS = volume probe, `\n| LIMIT 0` = candidate validation, else = source-wide conflict probe.
    const createScriptedClient = (probeColumns: unknown[]) => {
      const candidateCalls: Array<Record<string, unknown>> = [];
      const query = jest.fn(async (params: Record<string, unknown>) => {
        const q = String(params.query);
        if (q.includes('STATS')) {
          // Dense => narrow (now-10m) lookback, so a filter would prune history.
          return countResponse(100_000);
        }
        if (q.includes('\n| LIMIT 0')) {
          candidateCalls.push(params);
          return { columns: [], values: [] };
        }
        return { columns: probeColumns, values: [] };
      });
      return {
        esClient: { esql: { query } } as unknown as ElasticsearchClient,
        candidateCalls,
      };
    };

    const CONFLICT_COLUMNS = [
      {
        name: 'exception.message',
        type: 'unsupported',
        original_types: ['keyword', 'text'],
        suggested_cast: 'keyword',
      },
    ];

    it('drops the lookback filter for a candidate that references a union field', async () => {
      const { esClient, candidateCalls } = createScriptedClient(CONFLICT_COLUMNS);

      const { result } = await runIdentifyKIQueries({
        esClient,
        scriptedAddQueries: [
          [scriptedQuery('FROM logs | WHERE exception.message::keyword == "boom"')],
        ],
      });

      expect(result.queries).toHaveLength(1);
      expect(candidateCalls).toHaveLength(1);
      expect(candidateCalls[0]).not.toHaveProperty('filter');
    });

    it('keeps the lookback filter for a candidate that references no union field, even when the source has conflicts', async () => {
      const { esClient, candidateCalls } = createScriptedClient(CONFLICT_COLUMNS);

      const { result } = await runIdentifyKIQueries({
        esClient,
        scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "boom"')]],
      });

      expect(result.queries).toHaveLength(1);
      expect(candidateCalls).toHaveLength(1);
      expect(candidateCalls[0].filter).toEqual({
        range: { '@timestamp': { gte: 'now-10m', lte: 'now' } },
      });
    });

    it('keeps the narrow lookback filter when the stream has no conflicts', async () => {
      const { esClient, candidateCalls } = createScriptedClient([
        { name: 'message', type: 'text' },
      ]);

      const { result } = await runIdentifyKIQueries({
        esClient,
        scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "boom"')]],
      });

      expect(result.queries).toHaveLength(1);
      expect(candidateCalls).toHaveLength(1);
      expect(candidateCalls[0].filter).toEqual({
        range: { '@timestamp': { gte: 'now-10m', lte: 'now' } },
      });
    });
  });
});

describe('zero-query observability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const zeroQueryWarnLines = () =>
    (logger.warn as jest.Mock).mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.includes('Generated 0 Significant Event KI queries'));

  const zeroQueryDebugLines = () =>
    (logger.debug as jest.Mock).mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.includes('Generated 0 Significant Event KI queries'));

  const allLogLines = () =>
    [
      ...(logger.warn as jest.Mock).mock.calls,
      ...(logger.debug as jest.Mock).mock.calls,
      ...(logger.trace as jest.Mock).mock.calls,
    ].map((call) => String(call[0]));

  it('logs exactly one debug zero-query line, and no warn zero-query line, for a featureless stream', async () => {
    const { result } = await runIdentifyKIQueries({
      features: [],
      callGetStreamFeatures: true,
    });

    expect(result.queries).toHaveLength(0);
    expect(zeroQueryDebugLines()).toHaveLength(1);
    expect(zeroQueryDebugLines()[0]).toContain('observed=no_features_returned');
    expect(zeroQueryDebugLines()[0]).toContain('max_steps=4');
    expect(zeroQueryWarnLines()).toHaveLength(0);
  });

  it('warns when the model submits queries after feature inspection returns nothing', async () => {
    const { result } = await runIdentifyKIQueries({
      features: [],
      callGetStreamFeatures: true,
      scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "x"')]],
    });

    expect(result.queries).toHaveLength(0);
    expect(result.toolUsage.add_queries.calls).toBe(1);
    expect(zeroQueryWarnLines()).toHaveLength(1);
    expect(zeroQueryWarnLines()[0]).toContain('observed=add_queries_called_no_accepted_queries');
    expect(zeroQueryWarnLines()[0]).toContain('features_returned=0');
    expect(zeroQueryDebugLines()).toHaveLength(0);
  });

  it('warns exactly one zero-query line with observed=no_get_stream_features_calls when no feature inspection ran', async () => {
    const { result } = await runIdentifyKIQueries({
      callGetStreamFeatures: false,
      scriptedAddQueries: [],
    });

    expect(result.queries).toHaveLength(0);
    expect(zeroQueryWarnLines()).toHaveLength(1);
    expect(zeroQueryWarnLines()[0]).toContain('observed=no_get_stream_features_calls');
    expect(zeroQueryWarnLines()[0]).toContain('get_stream_features_calls=0');
  });

  it('warns exactly one zero-query line with observed=get_stream_features_failed when feature inspection failed', async () => {
    const { result } = await runIdentifyKIQueries({
      getFeaturesError: new Error('ES unavailable'),
    });

    expect(result.queries).toHaveLength(0);
    // The failure path may emit an unrelated warning; filter by the zero-query message itself.
    expect(zeroQueryWarnLines()).toHaveLength(1);
    expect(zeroQueryWarnLines()[0]).toContain('observed=get_stream_features_failed');
    expect(zeroQueryWarnLines()[0]).toContain('get_stream_features_failures=1');
  });

  it('warns exactly one zero-query line with observed=no_add_queries_calls when features were returned but no add_queries call ran', async () => {
    const { result } = await runIdentifyKIQueries({ scriptedAddQueries: [] });

    expect(result.queries).toHaveLength(0);
    expect(zeroQueryWarnLines()).toHaveLength(1);
    expect(zeroQueryWarnLines()[0]).toContain('observed=no_add_queries_calls');
    expect(zeroQueryWarnLines()[0]).toContain('features_returned=1');
  });

  it('warns exactly one zero-query line with observed=add_queries_called_no_accepted_queries when nothing was accepted', async () => {
    const { result } = await runIdentifyKIQueries({
      scriptedAddQueries: [
        [scriptedQuery('FROM logs | WHERE message : "customer secret query text"')],
      ],
    });

    expect(result.queries).toHaveLength(0);
    expect(result.toolUsage.add_queries.calls).toBe(1);
    expect(zeroQueryWarnLines()).toHaveLength(1);
    expect(zeroQueryWarnLines()[0]).toContain('observed=add_queries_called_no_accepted_queries');
    expect(zeroQueryWarnLines()[0]).toContain('add_queries_calls=1');
    expect(zeroQueryWarnLines()[0]).toContain('add_queries_failures=1');
  });

  it('does not warn when generation succeeds', async () => {
    const { result } = await runIdentifyKIQueries({
      scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "x"')]],
    });

    expect(result.queries).toHaveLength(1);
    expect(result.reasoningDiagnostics).toEqual({ externalContentToolContinuations: 0 });
    expect(zeroQueryWarnLines()).toHaveLength(0);
    expect(zeroQueryDebugLines()).toHaveLength(0);
  });

  it('logs exactly one zero-query line, on the warn channel, when feature inspection fails', async () => {
    await runIdentifyKIQueries({ getFeaturesError: new Error('ES unavailable') });
    expect(zeroQueryWarnLines()).toHaveLength(1);
    expect(zeroQueryDebugLines()).toHaveLength(0);
  });

  it('never logs query text, feature content, or other model-authored text', async () => {
    await runIdentifyKIQueries({
      scriptedAddQueries: [
        [scriptedQuery('FROM logs | WHERE message : "customer secret query text"')],
      ],
    });

    for (const line of allLogLines()) {
      expect(line).not.toContain('customer secret query text');
      expect(line).not.toContain('Detects the condition');
      expect(line).not.toContain('Service A');
      expect(line).not.toContain('A service');
      expect(line).not.toContain('FROM logs');
    }
  });
});
