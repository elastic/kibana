/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WRITE_QUERIES_TOOL_ID } from '@kbn/significant-events-plugin/server';
import {
  collectQueryAttempts,
  computeToolUsage,
  getSuccessfulWriteQueriesParams,
} from './run_ki_query_generation_agent';

describe('computeToolUsage', () => {
  it('matches canonical dotted tool ids to model-facing underscored ids', () => {
    expect(
      computeToolUsage([
        {
          type: 'tool_call',
          tool_id: 'platform.sig_events.ki_features_get',
          results: [{ type: 'other', data: { features: [] } }],
        },
        {
          type: 'tool_call',
          tool_id: WRITE_QUERIES_TOOL_ID,
          results: [{ type: 'other', data: { written: true, queries: [{}] } }],
        },
      ])
    ).toEqual({
      get_stream_features: { calls: 1, failures: 0, latency_ms: 0 },
      add_queries: { calls: 1, failures: 0, latency_ms: 0 },
    });
  });

  it('treats a successful empty write as abstention rather than add_queries usage', () => {
    expect(
      computeToolUsage([
        {
          type: 'tool_call',
          tool_id: WRITE_QUERIES_TOOL_ID,
          params: { queries: [] },
          results: [{ type: 'other', data: { written: true, count: 0, queries: [] } }],
        },
      ]).add_queries
    ).toEqual({ calls: 0, failures: 0, latency_ms: 0 });
  });
});

describe('collectQueryAttempts', () => {
  it('collects accepted and rejected queries across validation rounds', () => {
    expect(
      collectQueryAttempts([
        {
          type: 'tool_call',
          tool_id: 'platform.sig_events.ki_queries_validate',
          results: [
            {
              type: 'other',
              data: {
                queries: [
                  {
                    query: { title: 'Noisy', esql: 'FROM logs', replaces: 'old-query' },
                    valid: false,
                    status: 'Duplicate',
                    exactDuplicate: true,
                    failureReason: 'validation_error',
                  },
                ],
              },
            },
          ],
        },
        {
          type: 'tool_call',
          tool_id: 'platform_sig_events_ki_queries_validate',
          results: [
            {
              type: 'other',
              data: {
                queries: [
                  {
                    query: { title: 'Repaired', esql: 'FROM logs | WHERE error.code == 500' },
                    valid: true,
                    status: 'Added',
                  },
                ],
              },
            },
          ],
        },
      ])
    ).toEqual([
      {
        title: 'Noisy',
        esql: 'FROM logs',
        status: 'Duplicate',
        replaces: 'old-query',
        exactDuplicate: true,
        failureReason: 'validation_error',
      },
      {
        title: 'Repaired',
        esql: 'FROM logs | WHERE error.code == 500',
        status: 'Added',
      },
    ]);
  });
});

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
                title: 'Unvalidated query',
                description: 'unvalidated',
                esql: { query: 'FROM other-stream' },
                category: 'error',
                severity_score: 1,
                features: [{ id: 'other-feature' }],
              },
            ],
          },
          results: [
            {
              type: 'other',
              data: {
                written: true,
                count: 1,
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
            },
          ],
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

  it('does not accept a written result without server-validated queries', () => {
    expect(() =>
      getSuccessfulWriteQueriesParams([
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
    ).toThrow('did not successfully call write_queries');
  });
});
