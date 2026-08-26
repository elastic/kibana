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
import type { Streams } from '@kbn/streams-schema';

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

  it('floors the window at the 24h evidence window', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(100_000));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-1440m');
  });

  it('widens the window for a sparse stream', async () => {
    const { esClient, query } = createEsClient();
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

  it('falls back to the evidence window when the probe itself fails', async () => {
    const { esClient, query } = createEsClient();
    query.mockRejectedValueOnce(new Error('Request timed out'));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-1440m');
    expect(logger.debug).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// identifyKIQueries agent harness
// ---------------------------------------------------------------------------

const inferenceClient = {} as BoundInferenceClient;

const stream = {
  name: 'logs',
  description: 'A test stream',
} as Streams.all.Definition;

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
  } as unknown as Awaited<ReturnType<typeof executeAsReasoningAgent>>);

interface HarnessOptions {
  requireQueryIntent?: boolean;
  collectQueryAttempts?: boolean;
  existingQueries?: ExistingQuerySummary[];
  maxExistingQueriesForContext?: number;
  /** Overrides the stream, so tests can reproduce the eval's wildcard stream name. */
  stream?: Streams.all.Definition;
  /** Each array of query payloads is issued as its own `add_queries` call. */
  scriptedAddQueries?: Array<Array<Record<string, unknown>>>;
  callGetStreamFeatures?: boolean;
  features?: Feature[];
  esqlResponse?: (queryString: string) => unknown;
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
  const getFeatures = jest.fn(
    async () =>
      (options.features ?? [
        { id: 'feat-1', type: 'entity', title: 'Service A', description: 'A service' },
      ]) as Feature[]
  );

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

  const { esClient, query: esqlQueryMock } = createEsClient();
  esqlQueryMock.mockImplementation(async (request: { query: string }) => {
    const custom = options.esqlResponse?.(request.query);
    if (custom instanceof Error) throw custom;
    return custom !== undefined ? custom : countResponse(1);
  });

  const result = await identifyKIQueries({
    stream: options.stream ?? stream,
    esClient,
    getFeatures,
    inferenceClient,
    signal,
    logger,
    systemPrompt: 'system prompt',
    requireQueryIntent: options.requireQueryIntent,
    collectQueryAttempts: options.collectQueryAttempts,
    existingQueries: options.existingQueries,
    maxExistingQueriesForContext: options.maxExistingQueriesForContext,
  });

  return {
    result,
    capturedOptions: () => capturedOptions,
    toolResponses,
    addQueriesResponses,
    esqlQueryMock,
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
    it('advertises optional expects_matches in production', async () => {
      const { result, capturedOptions, addQueriesResponses } = await runIdentifyKIQueries({
        scriptedAddQueries: [[scriptedQuery('FROM logs | WHERE message == "x"')]],
      });

      const schema = addQueriesSchema(capturedOptions());
      expect(schema.properties.queries.items.properties.expects_matches).toEqual({
        type: 'boolean',
        description: expect.any(String),
      });
      expect(schema.properties.queries.items.required).not.toContain('expects_matches');

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].expects_matches).toBeUndefined();
      expect(result.queryAttempts).toBeUndefined();

      const addQueriesResponse = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string }> };
      };
      expect(addQueriesResponse.response.queries[0].status).toBe('Added');
    });

    it('does not count an intent-only rejection as an add_queries tool failure', async () => {
      const { result } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        collectQueryAttempts: true,
        scriptedAddQueries: [
          [scriptedQuery('FROM logs | WHERE message == "a"', { expects_matches: undefined })],
        ],
      });

      expect(result.toolUsage.add_queries.calls).toBe(1);
      expect(result.toolUsage.add_queries.failures).toBe(0);
      expect(result.queryAttempts?.[0]).toMatchObject({ failureReason: 'missing_intent' });
    });

    it('still counts a genuine failure alongside an intent-only rejection', async () => {
      const { result } = await runIdentifyKIQueries({
        requireQueryIntent: true,
        collectQueryAttempts: true,
        scriptedAddQueries: [
          [
            scriptedQuery('FROM logs | WHERE message == "a"', { expects_matches: undefined }),
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
        esqlResponse: (queryString: string) =>
          queryString.includes('"dup"') ? countResponse(0) : undefined,
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
      const wildcardStream = {
        name: 'logs*',
        description: 'A test stream',
      } as Streams.all.Definition;

      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        stream: wildcardStream,
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

  describe('zero-match existence protocol', () => {
    const deadEsql = 'FROM logs | WHERE error.type == "AutoOpsRuntimeException"';

    const deadPredicateResponses = (queryString: string) =>
      queryString.includes('"AutoOpsRuntimeException"') ? countResponse(0) : undefined;

    it('rejects an expected query with no matches', async () => {
      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        collectQueryAttempts: true,
        scriptedAddQueries: [[scriptedQuery(deadEsql)]],
        esqlResponse: deadPredicateResponses,
      });

      expect(result.queries).toHaveLength(0);

      const response = addQueriesResponses[0] as {
        response: { queries: Array<{ status: string; error?: string }> };
      };
      const [flagged] = response.response.queries;
      expect(flagged.status).toBe('Failed to add');
      expect(flagged.error).toContain('matched 0 documents');
      expect(flagged.error).toContain('expects_matches');

      expect(result.queryAttempts?.[0]).toMatchObject({
        failureReason: 'no_matches',
      });
    });

    it('accepts a zero-match watch', async () => {
      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        scriptedAddQueries: [[scriptedQuery(deadEsql, { expects_matches: false })]],
        esqlResponse: deadPredicateResponses,
      });

      const response = addQueriesResponses[0] as {
        response: { queries: Array<{ hints?: string[] }> };
      };
      expect(response.response.queries[0].hints).toEqual([expect.stringContaining('watch query')]);
      expect(result.queries[0].expects_matches).toBe(false);
    });

    it('promotes a matching watch to a live query', async () => {
      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        scriptedAddQueries: [
          [scriptedQuery('FROM logs | WHERE error.type == "Live"', { expects_matches: false })],
        ],
      });

      const response = addQueriesResponses[0] as {
        response: { queries: Array<{ hints?: string[] }> };
      };
      expect(response.response.queries[0].hints).toEqual([
        expect.stringContaining('recorded as a live query'),
      ]);
      expect(result.queries[0].expects_matches).toBe(true);
    });

    it('skips existence validation for STATS queries', async () => {
      const statsEsql =
        'FROM logs | STATS metric_value = COUNT(*) WHERE error.type == "Absent" BY bucket = BUCKET(@timestamp, 1 minute) | KEEP bucket, metric_value';
      const { result, esqlQueryMock } = await runIdentifyKIQueries({
        scriptedAddQueries: [[scriptedQuery(statsEsql)]],
        esqlResponse: (queryString: string) =>
          queryString.includes('"Absent"') ? countResponse(0) : undefined,
      });

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].type).toBe('stats');
      expect(esqlQueryMock.mock.calls.map(([request]) => request.query)).toEqual([
        'FROM logs, logs.* | STATS total = COUNT(*)',
        `${statsEsql.replace('FROM logs', 'FROM logs, logs.*')}\n| LIMIT 0`,
      ]);
    });

    it('distinguishes an unmapped field found in _source', async () => {
      const unmappedEsql = 'FROM logs | WHERE attributes.exception.type == "OutOfMemoryError"';

      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        collectQueryAttempts: true,
        scriptedAddQueries: [[scriptedQuery(unmappedEsql)]],
        esqlResponse: (queryString: string) => {
          if (queryString.startsWith('SET unmapped_fields')) return countResponse(4);
          if (queryString.includes('attributes.exception.type')) {
            return new Error('Unknown column [attributes.exception.type]');
          }
          return undefined;
        },
      });

      expect(result.queries).toHaveLength(0);

      const response = addQueriesResponses[0] as {
        response: { queries: Array<{ error?: string }> };
      };
      const [flagged] = response.response.queries;
      expect(flagged.error).toContain('queryable schema');
      expect(flagged.error).toContain('attributes.exception.type');

      expect(result.queryAttempts?.[0]).toMatchObject({
        failureReason: 'unmapped_field',
      });
    });

    it('rejects an unknown field absent from _source', async () => {
      const unknownEsql = 'FROM logs | WHERE nope.field == "value"';

      const { result, addQueriesResponses } = await runIdentifyKIQueries({
        collectQueryAttempts: true,
        scriptedAddQueries: [[scriptedQuery(unknownEsql)]],
        esqlResponse: (queryString: string) => {
          if (queryString.startsWith('SET unmapped_fields')) return countResponse(0);
          if (queryString.includes('nope.field')) {
            return new Error('Unknown column [nope.field]');
          }
          return undefined;
        },
      });

      expect(result.queries).toHaveLength(0);
      const response = addQueriesResponses[0] as {
        response: { queries: Array<{ error?: string }> };
      };
      expect(response.response.queries[0].error).toContain('nope.field');
      expect(result.queryAttempts?.[0]).toMatchObject({
        failureReason: 'no_matches',
      });
    });

    it('keeps STATS unknown columns as validation errors', async () => {
      const esql =
        'FROM logs | STATS metric_value = PERCENTILE(missing.duration, 95) BY bucket = BUCKET(@timestamp, 1 minute) | KEEP bucket, metric_value';
      const { result } = await runIdentifyKIQueries({
        collectQueryAttempts: true,
        scriptedAddQueries: [[scriptedQuery(esql)]],
        esqlResponse: (queryString: string) =>
          queryString.includes('PERCENTILE(missing.duration')
            ? new Error('Unknown column [missing.duration]')
            : undefined,
      });

      expect(result.queries).toHaveLength(0);
      expect(result.queryAttempts?.[0]).toMatchObject({
        failureReason: 'validation_error',
      });
    });
  });
});
