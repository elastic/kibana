/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlSources, summarizeToolEvidence, targetsPocIndex } from './tool_evidence';
import { POC_INDEX } from './constants';

describe('esqlSources', () => {
  it('extracts FROM sources, including METADATA and comma lists', () => {
    expect(esqlSources(`FROM ${POC_INDEX} METADATA _score | WHERE MATCH(text, "x")`)).toEqual([
      POC_INDEX,
    ]);
    expect(esqlSources('FROM a, b | LIMIT 3')).toEqual(['a', 'b']);
  });

  it('ignores `from` inside quoted text, later commands, comments and exclusions', () => {
    expect(
      esqlSources(
        `FROM ${POC_INDEX} METADATA _score | WHERE MATCH(text, "flight from Paris") | LIMIT 5`
      )
    ).toEqual([POC_INDEX]);
    expect(esqlSources(`FROM ${POC_INDEX} | WHERE text LIKE "*from home*"`)).toEqual([POC_INDEX]);
    expect(esqlSources(`// find it\nFROM ${POC_INDEX},\n  -other-* | LIMIT 1`)).toEqual([
      POC_INDEX,
    ]);
    expect(esqlSources('TS metrics-a | LIMIT 1')).toEqual(['metrics-a']);
    expect(esqlSources('ROW x = 1 | EVAL y = "from z"')).toEqual([]);
  });
});

describe('targetsPocIndex', () => {
  it('matches the exact name and covering wildcards only', () => {
    expect(targetsPocIndex(POC_INDEX)).toBe(true);
    expect(targetsPocIndex('longmemeval*')).toBe(true);
    expect(targetsPocIndex('*')).toBe(true);
    expect(targetsPocIndex('logs-*')).toBe(false);
  });
});

describe('summarizeToolEvidence', () => {
  it('records data access, session IDs and budget overruns without row values', () => {
    const summary = summarizeToolEvidence([
      { type: 'reasoning' },
      {
        type: 'tool_call',
        tool_id: 'platform.core.execute_esql',
        params: { query: `FROM ${POC_INDEX} | WHERE MATCH(text, "bike") | LIMIT 3` },
        results: [{ type: 'esql_results', data: { values: [['session-0003', 'user: my bike']] } }],
      },
      {
        type: 'tool_call',
        tool_id: 'platform.core.search',
        params: { query: 'everything', index: POC_INDEX },
        results: [{ type: 'other', data: { text: 'x'.repeat(100_000) } }],
      },
      { type: 'tool_call', tool_id: 'read_file', params: { path: '/x' }, results: [] },
    ]);

    expect(summary).toMatchObject({
      toolCallCount: 3,
      dataToolCallCount: 2,
      overBudgetCount: 1,
      usedReadFile: true,
      usedEsql: true,
      readsPocIndex: true,
      otherIndices: [],
      retrievedSessionIds: ['session-0003'],
    });
    expect(summary.toolCalls[0].query).toContain(POC_INDEX);
    expect(JSON.stringify(summary)).not.toContain('my bike');
  });

  it('flags reads of other user indices and ignores failed POC reads', () => {
    const summary = summarizeToolEvidence([
      {
        type: 'tool_call',
        tool_id: 'platform.core.search',
        params: { query: 'q', index: POC_INDEX },
        results: [{ type: 'error', data: { message: 'boom' } }],
      },
      {
        type: 'tool_call',
        tool_id: 'platform.core.execute_esql',
        params: { query: 'FROM customer-data, .kibana | LIMIT 1' },
        results: [],
      },
    ]);
    expect(summary.readsPocIndex).toBe(false);
    expect(summary.otherIndices).toEqual(['customer-data']);
  });

  it('flags reads of the evaluation indices that hold the expected answers', () => {
    const summary = summarizeToolEvidence([
      {
        type: 'tool_call',
        tool_id: 'platform.core.search',
        params: { query: 'q', index: '.evaluation-dataset-examples-000001' },
        results: [],
      },
      {
        type: 'tool_call',
        tool_id: 'platform.core.execute_esql',
        params: { query: 'FROM .ds-.evaluation-scores-2026.11.25-000001, .kibana | LIMIT 1' },
        results: [],
      },
    ]);
    expect(summary.otherIndices).toEqual([
      '.evaluation-dataset-examples-000001',
      '.ds-.evaluation-scores-2026.11.25-000001',
    ]);
  });
});
