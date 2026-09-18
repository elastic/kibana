/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { build, parseFromClause, parseReturned, queryKindFor, SIGNAL_PRODUCER } from './transform';
import type { AgentInfo, ExecuteToolSpan } from './transform';

describe('parseFromClause', () => {
  it('extracts the index expression from a FROM clause', () => {
    expect(parseFromClause('FROM ai-index-idx-foo | LIMIT 10')).toBe('ai-index-idx-foo');
  });

  it('strips a trailing METADATA clause', () => {
    expect(parseFromClause('FROM logs-* METADATA _id | WHERE foo == 1')).toBe('logs-*');
  });

  it('returns undefined when there is no FROM clause', () => {
    expect(parseFromClause('ROW x = 1')).toBeUndefined();
  });

  it('returns undefined for an undefined query', () => {
    expect(parseFromClause(undefined)).toBeUndefined();
  });

  it('returns undefined (does not throw) for a truthy non-string query', () => {
    expect(parseFromClause({ some: 'object' })).toBeUndefined();
    expect(parseFromClause(123)).toBeUndefined();
  });
});

describe('queryKindFor', () => {
  it.each([
    ['ai-index-idx-foo', 'ki_retrieval'],
    ['.ai-index-internal', 'ki_retrieval'],
    ['ki-support', 'ki_retrieval'],
    ['logs-*', 'raw_access'],
    ['metrics-system.cpu-*', 'raw_access'],
  ] as const)('classifies %s as %s', (targetIndex, expected) => {
    expect(queryKindFor(targetIndex)).toBe(expected);
  });

  it('returns other when there is no target index', () => {
    expect(queryKindFor(undefined)).toBe('other');
  });
});

describe('parseReturned', () => {
  it('extracts columns/row_count from an execute_esql-style tool result envelope', () => {
    const result = JSON.stringify({
      results: [
        { type: 'query', data: { esql: 'FROM foo' } },
        {
          type: 'esqlResults',
          data: {
            source: 'esql',
            columns: [{ name: 'title' }, { name: 'count' }],
            values: [
              ['a', 1],
              ['b', 2],
            ],
          },
        },
      ],
    });

    expect(parseReturned(result)).toEqual({ columns: ['title', 'count'], row_count: 2 });
  });

  it('extracts columns/row_count from a top-level {columns,values} shape', () => {
    const result = JSON.stringify({ columns: ['id'], values: [['1']] });
    expect(parseReturned(result)).toEqual({ columns: ['id'], row_count: 1 });
  });

  it('returns an empty result for invalid JSON', () => {
    expect(parseReturned('not json')).toEqual({ columns: [], row_count: 0 });
  });

  it('returns an empty result for undefined/null/empty input', () => {
    expect(parseReturned(undefined)).toEqual({ columns: [], row_count: 0 });
    expect(parseReturned(null)).toEqual({ columns: [], row_count: 0 });
    expect(parseReturned('')).toEqual({ columns: [], row_count: 0 });
  });

  it('returns an empty result for a non-ES|QL tool result', () => {
    expect(
      parseReturned(JSON.stringify({ results: [{ type: 'other', data: { ok: true } }] }))
    ).toEqual({ columns: [], row_count: 0 });
  });
});

const userAgent: AgentInfo = {
  name: 'support-agent',
  id: 'agent-1',
  class: 'user',
  conversationId: 'conversation-1',
};

const managementAgent: AgentInfo = {
  name: 'Context Engine',
  id: 'platform.context_engine.agent',
  class: 'management',
  conversationId: 'conversation-mgmt',
};

const toolRow = (overrides: Partial<ExecuteToolSpan> = {}): ExecuteToolSpan => ({
  '@timestamp': '2026-07-08T12:10:30.000Z',
  trace_id: 'trace-1',
  span_id: 'span-1',
  'attributes.gen_ai.tool.name': 'platform.core.execute_esql',
  'attributes.gen_ai.tool.call.id': 'call-1',
  'attributes.gen_ai.tool.call.arguments': JSON.stringify({
    query: 'FROM ai-index-idx-foo | LIMIT 10',
  }),
  'attributes.gen_ai.tool.call.result': JSON.stringify({
    results: [
      {
        type: 'esqlResults',
        data: { columns: [{ name: 'title' }], values: [['a']] },
      },
    ],
  }),
  duration: 5_000_000,
  'status.code': 'Ok',
  'status.message': null,
  ...overrides,
});

describe('build', () => {
  it('emits one raw tool_call signal per span, keyed by {trace_id}:{span_id}', () => {
    const signals = build({
      toolRows: [toolRow()],
      convAgent: new Map([['trace-1', userAgent]]),
    });

    expect(signals).toHaveLength(1);
    const [signal] = signals;
    expect(signal.signal_id).toBe('trace-1:span-1');
    expect(signal.signal_type).toBe('tool_call');
    expect(signal.trace_ids).toEqual(['trace-1']);
    expect(signal.tags).toEqual([]);
    expect(signal['@timestamp']).toBe('2026-07-08T12:10:30.000Z');
    expect(signal.data.producer).toBe(SIGNAL_PRODUCER);
    expect(signal.data.span_id).toBe('span-1');
    expect(signal.data.tool).toBe('platform.core.execute_esql');
    expect(signal.data.agent).toEqual({ name: 'support-agent', id: 'agent-1', class: 'user' });
    expect(signal.data.conversation_id).toBe('conversation-1');
    expect(signal.data.query).toBe('FROM ai-index-idx-foo | LIMIT 10');
    expect(signal.data.query_kind).toBe('ki_retrieval');
    expect(signal.data.target_index).toBe('ai-index-idx-foo');
    expect(signal.data.returned).toEqual({ columns: ['title'], row_count: 1 });
    expect(signal.data.status).toBe('Ok');
    expect(signal.data.duration_ms).toBe(5);
    expect(signal.data.round_signals).toEqual({
      esql_count: 1,
      raw_query_count: 0,
      ki_retrieval_count: 1,
    });
  });

  it('never includes an ai_index_id (signals are global)', () => {
    const [signal] = build({ toolRows: [toolRow()], convAgent: new Map() });
    expect((signal.data as Record<string, unknown>).ai_index_id).toBeUndefined();
    expect((signal as unknown as Record<string, unknown>).ai_index_id).toBeUndefined();
  });

  it('falls back to an unknown user agent when the round has no invoke_agent span', () => {
    const [signal] = build({ toolRows: [toolRow()], convAgent: new Map() });
    expect(signal.data.agent).toEqual({ name: '', id: '', class: 'user' });
    expect(signal.data.conversation_id).toBeUndefined();
  });

  it('attributes management-agent rounds with class "management"', () => {
    const [signal] = build({
      toolRows: [toolRow()],
      convAgent: new Map([['trace-1', managementAgent]]),
    });
    expect(signal.data.agent.class).toBe('management');
  });

  it('does not emit a signal for a tool call with no parsed query (query_kind "other")', () => {
    const signals = build({
      toolRows: [toolRow({ 'attributes.gen_ai.tool.call.arguments': JSON.stringify({}) })],
      convAgent: new Map([['trace-1', userAgent]]),
    });
    expect(signals).toHaveLength(0);
  });

  it('marks the signal as Error and carries the error message from status.message', () => {
    const [signal] = build({
      toolRows: [toolRow({ 'status.code': 'Error', 'status.message': 'boom' })],
      convAgent: new Map([['trace-1', userAgent]]),
    });
    expect(signal.data.status).toBe('Error');
    expect(signal.data.error).toBe('boom');
  });

  it('computes looped/round_signals across every span in the round (raw-only is not a fallback)', () => {
    const rawArgs = JSON.stringify({ query: 'FROM logs-* | LIMIT 10' });
    const rows = [
      toolRow({ span_id: 'span-1', 'attributes.gen_ai.tool.call.arguments': rawArgs }),
      toolRow({ span_id: 'span-2', 'attributes.gen_ai.tool.call.arguments': rawArgs }),
      toolRow({ span_id: 'span-3', 'attributes.gen_ai.tool.call.arguments': rawArgs }),
    ];

    const signals = build({ toolRows: rows, convAgent: new Map([['trace-1', userAgent]]) });

    expect(signals).toHaveLength(3);
    for (const signal of signals) {
      expect(signal.data.looped).toBe(true);
      // No KI retrieval happened, so raw access here is direct, not a fallback.
      expect(signal.data.fell_back_to_raw).toBe(false);
      expect(signal.data.query_kind).toBe('raw_access');
      expect(signal.data.round_signals).toEqual({
        esql_count: 3,
        raw_query_count: 3,
        ki_retrieval_count: 0,
      });
    }
  });

  it('marks fell_back_to_raw only when a round mixes KI retrieval and raw access', () => {
    const rows = [
      // Default toolRow queries a ki-retrieval index.
      toolRow({ span_id: 'span-1' }),
      toolRow({
        span_id: 'span-2',
        'attributes.gen_ai.tool.call.arguments': JSON.stringify({
          query: 'FROM logs-* | LIMIT 10',
        }),
      }),
    ];

    const signals = build({ toolRows: rows, convAgent: new Map([['trace-1', userAgent]]) });

    expect(signals).toHaveLength(2);
    for (const signal of signals) {
      expect(signal.data.fell_back_to_raw).toBe(true);
      expect(signal.data.round_signals).toEqual({
        esql_count: 2,
        raw_query_count: 1,
        ki_retrieval_count: 1,
      });
    }
  });

  it('does not mark a round of fewer than 3 ES|QL calls as looped', () => {
    const rows = [toolRow({ span_id: 'span-1' }), toolRow({ span_id: 'span-2' })];
    const signals = build({ toolRows: rows, convAgent: new Map([['trace-1', userAgent]]) });
    expect(signals.every((signal) => signal.data.looped === false)).toBe(true);
  });

  it('truncates the persisted query and error to 1024 characters', () => {
    const longQuery = `FROM logs-* | WHERE message == "${'x'.repeat(5000)}"`;
    const [signal] = build({
      toolRows: [
        toolRow({
          'attributes.gen_ai.tool.call.arguments': JSON.stringify({ query: longQuery }),
          'status.code': 'Error',
          'status.message': 'e'.repeat(5000),
        }),
      ],
      convAgent: new Map([['trace-1', userAgent]]),
    });

    expect(signal.data.query?.length).toBe(1024);
    expect(signal.data.error?.length).toBe(1024);
    // The FROM target is still parsed from the (untruncated) head of the query.
    expect(signal.data.target_index).toBe('logs-*');
  });

  it('does not throw (and emits no signal) for a non-string query', () => {
    const signals = build({
      toolRows: [
        toolRow({
          'attributes.gen_ai.tool.call.arguments': JSON.stringify({ query: { nested: true } }),
        }),
      ],
      convAgent: new Map([['trace-1', userAgent]]),
    });
    expect(signals).toHaveLength(0);
  });

  it('is idempotent: the same span always yields the same signal_id', () => {
    const first = build({ toolRows: [toolRow()], convAgent: new Map() });
    const second = build({ toolRows: [toolRow()], convAgent: new Map() });
    expect(first[0].signal_id).toBe(second[0].signal_id);
  });

  it('groups spans into independent rounds by trace_id', () => {
    const rows = [
      toolRow({ trace_id: 'trace-1', span_id: 'span-1' }),
      toolRow({ trace_id: 'trace-2', span_id: 'span-1' }),
    ];
    const signals = build({
      toolRows: rows,
      convAgent: new Map([
        ['trace-1', userAgent],
        ['trace-2', managementAgent],
      ]),
    });

    expect(signals).toHaveLength(2);
    expect(signals.find((s) => s.signal_id === 'trace-1:span-1')?.data.agent.class).toBe('user');
    expect(signals.find((s) => s.signal_id === 'trace-2:span-1')?.data.agent.class).toBe(
      'management'
    );
  });
});
