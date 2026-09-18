/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_BUILTIN_AGENTS } from '@kbn/agent-builder-server/allow_lists';
import { toEsqlStringLiteral, buildTraceQuery, buildTraceQueries } from './trace_queries';

describe('toEsqlStringLiteral', () => {
  it('wraps a plain string in double quotes', () => {
    expect(toEsqlStringLiteral('hello')).toBe('"hello"');
  });

  it('escapes double quotes inside the value', () => {
    expect(toEsqlStringLiteral('say "hi"')).toBe('"say \\"hi\\""');
  });

  it('escapes backslashes inside the value', () => {
    expect(toEsqlStringLiteral('a\\b')).toBe('"a\\\\b"');
  });

  it('escapes both backslashes and double quotes', () => {
    expect(toEsqlStringLiteral('a\\"b')).toBe('"a\\\\\\"b"');
  });
});

describe('buildTraceQuery', () => {
  const spaceId = 'default';

  describe('type: esql', () => {
    it('returns the value verbatim as the query', () => {
      const trace = { type: 'esql' as const, value: 'FROM logs | LIMIT 10' };
      expect(buildTraceQuery(trace, spaceId)).toBe('FROM logs | LIMIT 10');
    });
  });

  describe('type: index', () => {
    it('returns FROM <value> for a valid index name', () => {
      const trace = { type: 'index' as const, value: 'my-index' };
      expect(buildTraceQuery(trace, spaceId)).toBe('FROM my-index');
    });

    it('returns FROM <value> for a wildcard pattern', () => {
      const trace = { type: 'index' as const, value: 'logs-*' };
      expect(buildTraceQuery(trace, spaceId)).toBe('FROM logs-*');
    });

    it('does not reject a value that is not a valid index name', () => {
      const trace = { type: 'index' as const, value: 'not an index' };
      expect(buildTraceQuery(trace, spaceId)).toBe('FROM not an index');
    });
  });

  describe('type: elastic_agent', () => {
    it('builds a query using the traces index for the given spaceId', () => {
      const trace = { type: 'elastic_agent' as const, value: 'my-agent' };
      const query = buildTraceQuery(trace, spaceId);
      expect(query).toContain('FROM traces-agent_builder.otel-default');
    });

    it('contains the raw agent id in double-quoted form', () => {
      const trace = { type: 'elastic_agent' as const, value: 'my-agent' };
      const query = buildTraceQuery(trace, spaceId);
      expect(query).toContain('"my-agent"');
    });

    it('contains the custom-<hash> form', () => {
      // hash('my-agent') first 16 hex chars = 178890c4e2da4e09
      const trace = { type: 'elastic_agent' as const, value: 'my-agent' };
      const query = buildTraceQuery(trace, spaceId);
      expect(query).toContain('"custom-178890c4e2da4e09"');
    });

    it('escapes double quotes in the agent id for both the raw and hashed occurrences', () => {
      // hash('agent"quote') = 868decb72393bc99
      const trace = { type: 'elastic_agent' as const, value: 'agent"quote' };
      const query = buildTraceQuery(trace, spaceId);
      // raw id with escaped quote
      expect(query).toContain('"agent\\"quote"');
      // hashed value has no special chars, just confirm it is present
      expect(query).toContain('"custom-868decb72393bc99"');
    });

    it('matches the default built-in agent by raw id only', () => {
      const trace = { type: 'elastic_agent' as const, value: agentBuilderDefaultAgentId };
      expect(buildTraceQuery(trace, spaceId)).toBe(
        `FROM traces-agent_builder.otel-default\n| WHERE attributes.gen_ai.agent.id IN ("${agentBuilderDefaultAgentId}")`
      );
    });

    it('matches allow-listed built-in agents by raw id only', () => {
      const builtinAgentId = AGENT_BUILDER_BUILTIN_AGENTS[0];
      const trace = { type: 'elastic_agent' as const, value: builtinAgentId };
      expect(buildTraceQuery(trace, spaceId)).toBe(
        `FROM traces-agent_builder.otel-default\n| WHERE attributes.gen_ai.agent.id IN ("${builtinAgentId}")`
      );
    });
  });
});

describe('buildTraceQueries', () => {
  it('returns an empty array for empty input', () => {
    expect(buildTraceQueries([], 'default')).toEqual([]);
  });

  it('attaches a query to every trace', () => {
    const traces = [
      { type: 'index' as const, value: 'valid-index' },
      { type: 'esql' as const, value: 'FROM foo' },
    ];
    expect(buildTraceQueries(traces, 'default')).toEqual([
      { type: 'index', value: 'valid-index', query: 'FROM valid-index' },
      { type: 'esql', value: 'FROM foo', query: 'FROM foo' },
    ]);
  });

  // A trace that cannot produce a usable query must not fail the whole list response.
  it('keeps building queries when a value is not a valid index name', () => {
    const traces = [
      { type: 'index' as const, value: 'valid-index' },
      { type: 'index' as const, value: 'not an index' },
    ];
    expect(buildTraceQueries(traces, 'default')).toEqual([
      { type: 'index', value: 'valid-index', query: 'FROM valid-index' },
      { type: 'index', value: 'not an index', query: 'FROM not an index' },
    ]);
  });
});
