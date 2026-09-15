/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID } from '@kbn/significant-events-plugin/server';
import {
  collectQueryAttempts,
  computeToolUsage,
  getFinalizedQueries,
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
          tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
          params: { queries: [{}] },
          results: [{ type: 'other', data: { finalized: true, finalized_queries: [{}] } }],
        },
      ])
    ).toEqual({
      get_stream_features: { calls: 1, failures: 0, latency_ms: 0 },
      add_queries: { calls: 1, failures: 0, latency_ms: 0 },
    });
  });

  it('treats a finalized empty batch as abstention rather than add_queries usage', () => {
    expect(
      computeToolUsage([
        {
          type: 'tool_call',
          tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
          params: { queries: [] },
          results: [{ type: 'other', data: { finalized: true, finalized_queries: [] } }],
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

describe('getFinalizedQueries', () => {
  it('returns a finalized batch', () => {
    expect(
      getFinalizedQueries([
        {
          type: 'tool_call',
          tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
          results: [
            {
              type: 'other',
              data: {
                finalized: true,
                finalized_queries: [
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
    ).toEqual([
      {
        type: 'match',
        title: 'Detects errors',
        description: 'desc',
        esql: { query: 'FROM logs' },
        category: 'error',
        severity_score: 70,
        features: [{ id: 'f1', run_id: 'r1' }],
      },
    ]);
  });

  it('does not fall back when the latest validation is not finalized', () => {
    expect(() =>
      getFinalizedQueries([
        {
          type: 'tool_call',
          tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
          params: { queries: [{}] },
          results: [
            {
              type: 'other',
              data: {
                finalized: true,
                finalized_queries: [{}],
              },
            },
          ],
        },
        {
          type: 'tool_call',
          tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
          params: { queries: [{}] },
          results: [{ type: 'other', data: { finalized: false, queries: [] } }],
        },
      ])
    ).toThrow('did not finalize validate_queries');
  });
});
