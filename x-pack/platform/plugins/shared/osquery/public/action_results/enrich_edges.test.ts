/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultEdges } from '../../common/search_strategy';
import { enrichEdgesWithErrors } from './enrich_edges';

const createEdge = (
  agentId: string,
  overrides: {
    completedAt?: string;
    errorKeyword?: string;
    errorValue?: string;
    errorSkipped?: string;
  } = {}
): ResultEdges[number] => ({
  _id: `result-${agentId}`,
  _index: '.fleet-actions-results-default',
  _source: {},
  fields: {
    agent_id: [agentId],
    'agent.id': [agentId],
    ...(overrides.completedAt ? { completed_at: [overrides.completedAt] } : {}),
    ...(overrides.errorKeyword ? { 'error.keyword': [overrides.errorKeyword] } : {}),
    ...(overrides.errorValue ? { error: [overrides.errorValue] } : {}),
    ...(overrides.errorSkipped ? { 'error.skipped': [overrides.errorSkipped] } : {}),
  },
});

describe('enrichEdgesWithErrors', () => {
  it('should return edges unchanged when they already have completed_at', () => {
    const edges = [createEdge('agent-1', { completedAt: '2025-01-20T00:00:00Z' })];
    const result = enrichEdgesWithErrors(edges, 'some error', true);

    expect(result).toEqual(edges);
  });

  it('should return edges unchanged when they already have error field', () => {
    const edges = [createEdge('agent-1', { errorValue: 'existing error' })];
    const result = enrichEdgesWithErrors(edges, 'another error', false);

    expect(result).toEqual(edges);
  });

  it('should return edges unchanged when they already have error.skipped', () => {
    const edges = [createEdge('agent-1', { errorSkipped: 'skipped reason' })];
    const result = enrichEdgesWithErrors(edges, undefined, false);

    expect(result).toEqual(edges);
  });

  it('should add error.skipped and error fields when action-level error is set', () => {
    const edges = [createEdge('agent-1')];
    const result = enrichEdgesWithErrors(edges, 'Action failed', false);

    expect(result[0].fields?.['error.skipped']).toEqual(['Action failed']);
    expect(result[0].fields?.error).toEqual(['Action failed']);
  });

  it('should add expired error when expired and no completed_at', () => {
    const edges = [createEdge('agent-1')];
    const result = enrichEdgesWithErrors(edges, undefined, true);

    expect(result[0].fields?.['error.keyword']).toEqual(['The action request timed out.']);
    expect(result[0].fields?.error).toEqual(['The action request timed out.']);
  });

  it('should prefer action-level error over expired state', () => {
    const edges = [createEdge('agent-1')];
    const result = enrichEdgesWithErrors(edges, 'Action error', true);

    // error takes priority — sets error.skipped, not error.keyword
    expect(result[0].fields?.['error.skipped']).toEqual(['Action error']);
    expect(result[0].fields?.['error.keyword']).toBeUndefined();
  });

  it('should not mutate original edges', () => {
    const edges = [createEdge('agent-1')];
    const originalFields = { ...edges[0].fields };
    enrichEdgesWithErrors(edges, 'Action failed', false);

    expect(edges[0].fields).toEqual(originalFields);
  });

  it('should handle empty edges array', () => {
    const result = enrichEdgesWithErrors([] as ResultEdges, 'error', true);

    expect(result).toEqual([]);
  });

  it('should enrich only edges without existing states in mixed arrays', () => {
    const edges = [
      createEdge('agent-1', { completedAt: '2025-01-20T00:00:00Z' }),
      createEdge('agent-2'), // no completed_at, no error
    ];
    const result = enrichEdgesWithErrors(edges, undefined, true);

    // First edge untouched (has completed_at)
    expect(result[0]).toBe(edges[0]);
    // Second edge enriched with expired
    expect(result[1].fields?.['error.keyword']).toEqual(['The action request timed out.']);
  });

  it('should not add any error fields when no error and not expired', () => {
    const edges = [createEdge('agent-1')];
    const result = enrichEdgesWithErrors(edges, undefined, false);

    expect(result[0].fields?.error).toBeUndefined();
    expect(result[0].fields?.['error.skipped']).toBeUndefined();
    expect(result[0].fields?.['error.keyword']).toBeUndefined();
  });
});
