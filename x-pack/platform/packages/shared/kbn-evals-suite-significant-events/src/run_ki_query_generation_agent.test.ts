/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WRITE_QUERIES_TOOL_ID } from '@kbn/significant-events-plugin/server';
import { getSuccessfulWriteQueriesParams } from './run_ki_query_generation_agent';

describe('getSuccessfulWriteQueriesParams', () => {
  it('uses the last successfully completed write_queries call', () => {
    expect(
      getSuccessfulWriteQueriesParams([
        {
          type: 'tool_call',
          tool_id: WRITE_QUERIES_TOOL_ID,
          params: {},
          results: [{ type: 'error', data: { message: 'Invalid parameters' } }],
        },
        {
          type: 'tool_call',
          tool_id: WRITE_QUERIES_TOOL_ID,
          params: {
            queries: [
              {
                type: 'match',
                title: 'Detects errors',
                description: 'desc',
                esql: { query: 'FROM logs' },
                category: 'error',
                severity_score: 70,
                features: [{ id: 'f1', run_id: 'r1' }],
              },
            ],
          },
          results: [{ type: 'other', data: { written: true, count: 1 } }],
        },
      ])
    ).toEqual({
      queries: [
        {
          type: 'match',
          title: 'Detects errors',
          description: 'desc',
          esql: { query: 'FROM logs' },
          category: 'error',
          severity_score: 70,
          features: [{ id: 'f1', run_id: 'r1' }],
        },
      ],
    });
  });

  it('throws when no successful write_queries call found', () => {
    expect(() =>
      getSuccessfulWriteQueriesParams([
        {
          type: 'tool_call',
          tool_id: WRITE_QUERIES_TOOL_ID,
          params: {},
          results: [{ type: 'error', data: { message: 'bad' } }],
        },
      ])
    ).toThrow('did not successfully call write_queries');
  });

  it('throws when queries is not an array', () => {
    expect(() =>
      getSuccessfulWriteQueriesParams([
        {
          type: 'tool_call',
          tool_id: WRITE_QUERIES_TOOL_ID,
          params: { queries: 'not-an-array' },
          results: [{ type: 'other', data: { written: true, count: 0 } }],
        },
      ])
    ).toThrow('returned invalid write_queries output');
  });
});
