/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { AiIndexTraceWithQuery } from '../../common/http_api/ai_indices';
import {
  findTraceRounds,
  readTraceTranscripts,
  ROUND_LOOKBACK_MS,
  targetOfTraceQuery,
  valueAt,
} from './trace_rounds';

const AGENT_QUERY =
  'FROM traces-agent_builder.otel-default\n| WHERE attributes.gen_ai.agent.id IN ("elastic-ai-agent")';
const agentTrace: AiIndexTraceWithQuery = {
  type: 'elastic_agent',
  value: 'elastic-ai-agent',
  query: AGENT_QUERY,
};

const roundsResponse = (rows: Array<[string, string]>) => ({
  columns: [
    { name: 'last_at', type: 'date' },
    { name: 'trace_id', type: 'keyword' },
  ],
  values: rows.map(([lastAt, traceId]) => [lastAt, traceId]),
});

/** A `chat` span as stored: attributes as an object with dotted keys, messages as JSON strings. */
const chatHit = (traceId: string, question: string, answer: string) => ({
  _source: {
    trace_id: traceId,
    attributes: {
      'gen_ai.input.messages': JSON.stringify([
        { role: 'user', parts: [{ type: 'text', content: question }] },
      ]),
      'gen_ai.output.messages': JSON.stringify([
        { role: 'assistant', parts: [{ type: 'text', content: answer }] },
      ]),
    },
  },
});

const agentHit = (traceId: string) => ({
  _source: {
    trace_id: traceId,
    attributes: {
      'gen_ai.agent.id': 'elastic-ai-agent',
      'gen_ai.agent.name': 'Elastic AI Agent',
      'gen_ai.conversation.id': 'conv-1',
    },
  },
});

describe('targetOfTraceQuery', () => {
  it('reads the index expression of the FROM', () => {
    expect(targetOfTraceQuery(AGENT_QUERY)).toBe('traces-agent_builder.otel-default');
    expect(targetOfTraceQuery('FROM a, b | LIMIT 10')).toBe('a,b');
  });

  it('fails for a query it cannot read spans from', () => {
    expect(() => targetOfTraceQuery('ROW a = 1')).toThrow('no FROM');
  });
});

describe('valueAt', () => {
  it('reads a dotted path stored flat, nested, or as an object with dotted keys', () => {
    expect(valueAt({ 'a.b.c': 1 }, 'a.b.c')).toBe(1);
    expect(valueAt({ a: { b: { c: 2 } } }, 'a.b.c')).toBe(2);
    expect(valueAt({ attributes: { 'gen_ai.agent.id': 'x' } }, 'attributes.gen_ai.agent.id')).toBe(
      'x'
    );
    expect(valueAt({ a: 1 }, 'a.b')).toBeUndefined();
    expect(valueAt(undefined, 'a')).toBeUndefined();
  });
});

describe('findTraceRounds', () => {
  const esClient = elasticsearchClientMock.createElasticsearchClient();

  beforeEach(() => jest.clearAllMocks());

  it('finds the rounds that ended in the window, by their last span end, after the cursor', async () => {
    esClient.esql.query.mockResolvedValue(
      roundsResponse([['2026-11-11T13:12:03.357Z', 'trace-1']]) as never
    );

    const rounds = await findTraceRounds({
      esClient,
      query: AGENT_QUERY,
      since: '2026-11-11T12:00:00.000Z',
      after: 'trace-0',
      until: '2026-11-11T13:15:00.000Z',
      size: 50,
    });

    const [{ query, params }] = esClient.esql.query.mock.calls[0] as [
      { query: string; params: unknown[] }
    ];
    expect(query.startsWith(AGENT_QUERY)).toBe(true);
    expect(query).toContain(
      '| EVAL ended_at = COALESCE(TO_DATETIME(TO_LONG(@timestamp) + duration / 1000000), @timestamp)'
    );
    expect(query).toContain('| STATS last_at = MAX(ended_at) BY trace_id');
    expect(query).toContain('| LIMIT 50');
    expect(params).toEqual([
      {
        lookback: new Date(
          Date.parse('2026-11-11T12:00:00.000Z') - ROUND_LOOKBACK_MS
        ).toISOString(),
      },
      { until: '2026-11-11T13:15:00.000Z' },
      { since: '2026-11-11T12:00:00.000Z' },
      { after: 'trace-0' },
    ]);
    expect(rounds).toEqual([
      {
        traceId: 'trace-1',
        lastAt: '2026-11-11T13:12:03.357Z',
        target: 'traces-agent_builder.otel-default',
      },
    ]);
  });

  it('falls back to span starts for a source without a duration', async () => {
    esClient.esql.query
      .mockRejectedValueOnce(
        new errors.ResponseError({
          statusCode: 400,
          body: { error: { type: 'verification_exception', reason: 'Unknown column [duration]' } },
          headers: {},
          meta: {} as never,
          warnings: [],
        })
      )
      .mockResolvedValueOnce(roundsResponse([]) as never);

    await findTraceRounds({
      esClient,
      query: 'FROM my-spans',
      since: '2026-11-11T12:00:00.000Z',
      after: '',
      until: '2026-11-11T13:15:00.000Z',
      size: 50,
    });

    const [, [{ query }]] = esClient.esql.query.mock.calls as Array<[{ query: string }]>;
    expect(query).toContain('| EVAL ended_at = @timestamp');
  });
});

describe('readTraceTranscripts', () => {
  const esClient = elasticsearchClientMock.createElasticsearchClient();
  const window = { since: '2026-11-11T12:00:00.000Z', until: '2026-11-11T13:15:00.000Z' };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.search.mockImplementation(async (request) => {
      const filters = (request as { query: { bool: { filter: Array<Record<string, any>> } } }).query
        .bool.filter;
      const traceIds: string[] = filters[0].terms.trace_id;
      const operation = filters[1].term['attributes.gen_ai.operation.name'];
      return {
        hits: {
          hits: traceIds.map((traceId) =>
            operation === 'chat'
              ? chatHit(traceId, `Question of ${traceId}`, `Answer of ${traceId}`)
              : agentHit(traceId)
          ),
        },
      } as never;
    });
  });

  it('rebuilds each round as a dreaming memory, and moves the cursor to the end of the window', async () => {
    esClient.esql.query.mockResolvedValue(
      roundsResponse([['2026-11-11T13:12:03.357Z', 'trace-1']]) as never
    );

    const output = await readTraceTranscripts({
      esClient,
      traces: [agentTrace],
      spaceId: 'default',
      size: 50,
      ...window,
    });

    expect(output).toEqual({
      memories: [
        {
          id: 'trace:trace-1',
          type: 'trace.round',
          title: 'Agent conversation with Elastic AI Agent, round ending 2026-11-11T13:12:03.357Z',
          content: 'User: Question of trace-1\nAssistant: Answer of trace-1',
          updated_at: '2026-11-11T13:12:03.357Z',
          attributes: {
            'trace.id': 'trace-1',
            'trace.conversation_id': 'conv-1',
            'trace.agent_id': 'elastic-ai-agent',
          },
          permissions: { kibana: { privileges: [{ space: 'default' }] } },
        },
      ],
      resume_from: window.until,
      sources: [{ type: 'elastic_agent', value: 'elastic-ai-agent', rounds: 1 }],
      skipped: 0,
    });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'traces-agent_builder.otel-default',
        collapse: { field: 'trace_id' },
        sort: [{ '@timestamp': { order: 'desc' } }],
      })
    );
  });

  it('reads one round once across sources, and stops where a full source may hold more', async () => {
    const indexTrace: AiIndexTraceWithQuery = {
      type: 'index',
      value: 'my-spans',
      query: 'FROM my-spans',
    };
    esClient.esql.query
      // The agent source is full at size 2: rounds after trace-b may be missing from it.
      .mockResolvedValueOnce(
        roundsResponse([
          ['2026-11-11T12:10:00.000Z', 'trace-a'],
          ['2026-11-11T12:20:00.000Z', 'trace-b'],
        ]) as never
      )
      .mockResolvedValueOnce(
        roundsResponse([
          ['2026-11-11T12:10:00.000Z', 'trace-a'],
          ['2026-11-11T12:30:00.000Z', 'trace-c'],
        ]) as never
      );

    const output = await readTraceTranscripts({
      esClient,
      traces: [agentTrace, indexTrace],
      spaceId: 'default',
      size: 2,
      ...window,
    });

    expect(output.memories.map(({ id }) => id)).toEqual(['trace:trace-a', 'trace:trace-b']);
    expect(output.resume_from).toBe('2026-11-11T12:20:00.000Z');
    expect(output.resume_after).toBe('trace-b');
  });

  it('reports a source that fails, reads the others, and skips rounds with nothing to read', async () => {
    esClient.esql.query
      .mockRejectedValueOnce(new Error('no such index'))
      .mockResolvedValueOnce(roundsResponse([['2026-11-11T12:10:00.000Z', 'trace-a']]) as never);
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    const output = await readTraceTranscripts({
      esClient,
      traces: [agentTrace, { type: 'index', value: 'my-spans', query: 'FROM my-spans' }],
      spaceId: 'default',
      size: 50,
      ...window,
    });

    expect(output.sources).toEqual([
      { type: 'elastic_agent', value: 'elastic-ai-agent', rounds: 0, error: 'no such index' },
      { type: 'index', value: 'my-spans', rounds: 1 },
    ]);
    expect(output.memories).toEqual([]);
    expect(output.skipped).toBe(1);
    expect(output.resume_from).toBe(window.until);
  });

  it('reads nothing when the window is empty, and keeps the cursor', async () => {
    const output = await readTraceTranscripts({
      esClient,
      traces: [agentTrace],
      spaceId: 'default',
      size: 50,
      since: window.until,
      after: 'trace-z',
      until: window.since,
    });

    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(output).toEqual({
      memories: [],
      resume_from: window.until,
      resume_after: 'trace-z',
      sources: [],
      skipped: 0,
    });
  });
});
