/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultCountsMap } from './get_result_counts_for_actions';
import { buildPackResultCounts, buildSingleQueryResultCounts } from './build_result_counts';

describe('buildSingleQueryResultCounts', () => {
  it('returns counts from the map for a valid action id', () => {
    const map: ResultCountsMap = new Map([
      ['query-1', { totalRows: 10, respondedAgents: 3, successfulAgents: 2, errorAgents: 1 }],
    ]);

    expect(buildSingleQueryResultCounts('query-1', map)).toEqual({
      total_rows: 10,
      responded_agents: 3,
      successful_agents: 2,
      error_agents: 1,
    });
  });

  it('returns zeroes when action id is not in the map', () => {
    const map: ResultCountsMap = new Map();

    expect(buildSingleQueryResultCounts('missing-id', map)).toEqual({
      total_rows: 0,
      responded_agents: 0,
      successful_agents: 0,
      error_agents: 0,
    });
  });

  it('returns zeroes when action id is undefined', () => {
    const map: ResultCountsMap = new Map([
      ['query-1', { totalRows: 10, respondedAgents: 3, successfulAgents: 2, errorAgents: 1 }],
    ]);

    expect(buildSingleQueryResultCounts(undefined, map)).toEqual({
      total_rows: 0,
      responded_agents: 0,
      successful_agents: 0,
      error_agents: 0,
    });
  });
});

describe('buildPackResultCounts', () => {
  it('aggregates counts across multiple queries', () => {
    const map: ResultCountsMap = new Map([
      ['q-1', { totalRows: 5, respondedAgents: 2, successfulAgents: 2, errorAgents: 0 }],
      ['q-2', { totalRows: 3, respondedAgents: 4, successfulAgents: 3, errorAgents: 1 }],
      ['q-3', { totalRows: 0, respondedAgents: 1, successfulAgents: 1, errorAgents: 0 }],
    ]);

    expect(buildPackResultCounts(['q-1', 'q-2', 'q-3'], map)).toEqual({
      total_rows: 8,
      queries_with_results: 2,
      queries_total: 3,
      successful_agents: 3,
      error_agents: 1,
    });
  });

  it('returns zeroes when no action ids match', () => {
    const map: ResultCountsMap = new Map();

    expect(buildPackResultCounts(['q-1', 'q-2'], map)).toEqual({
      total_rows: 0,
      queries_with_results: 0,
      queries_total: 2,
      successful_agents: 0,
      error_agents: 0,
    });
  });

  it('uses agent counts from the query with most responded agents', () => {
    const map: ResultCountsMap = new Map([
      ['q-1', { totalRows: 1, respondedAgents: 10, successfulAgents: 8, errorAgents: 2 }],
      ['q-2', { totalRows: 1, respondedAgents: 5, successfulAgents: 5, errorAgents: 0 }],
    ]);

    const result = buildPackResultCounts(['q-1', 'q-2'], map);
    expect(result.successful_agents).toBe(8);
    expect(result.error_agents).toBe(2);
  });

  it('returns zeroes with queries_total: 0 for empty queryActionIds array', () => {
    const map: ResultCountsMap = new Map([
      ['q-1', { totalRows: 10, respondedAgents: 1, successfulAgents: 1, errorAgents: 0 }],
    ]);

    expect(buildPackResultCounts([], map)).toEqual({
      total_rows: 0,
      queries_with_results: 0,
      queries_total: 0,
      successful_agents: 0,
      error_agents: 0,
    });
  });

  it('uses first-seen agent counts when multiple queries tie on respondedAgents', () => {
    const map: ResultCountsMap = new Map([
      ['q-1', { totalRows: 5, respondedAgents: 3, successfulAgents: 2, errorAgents: 1 }],
      ['q-2', { totalRows: 5, respondedAgents: 3, successfulAgents: 1, errorAgents: 2 }],
    ]);

    const result = buildPackResultCounts(['q-1', 'q-2'], map);
    expect(result.successful_agents).toBe(2);
    expect(result.error_agents).toBe(1);
  });

  it('ignores entries in the map that are not referenced by queryActionIds', () => {
    const map: ResultCountsMap = new Map([
      ['q-1', { totalRows: 5, respondedAgents: 1, successfulAgents: 1, errorAgents: 0 }],
      [
        'q-unreferenced',
        { totalRows: 100, respondedAgents: 50, successfulAgents: 50, errorAgents: 0 },
      ],
    ]);

    expect(buildPackResultCounts(['q-1'], map)).toEqual({
      total_rows: 5,
      queries_with_results: 1,
      queries_total: 1,
      successful_agents: 1,
      error_agents: 0,
    });
  });
});
