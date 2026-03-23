/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultEdges } from '../../common/search_strategy';
import { transformStatusEdgesToRecords } from './transform_status_results';

const createEdge = (
  agentId: string,
  overrides: {
    completedAt?: string;
    errorKeyword?: string;
    errorValue?: string;
    errorSkipped?: string;
    count?: number;
  } = {}
): ResultEdges[number] => ({
  _id: `result-${agentId}`,
  _index: '.fleet-actions-results-default',
  _source: {
    ...(overrides.count != null
      ? { action_response: { osquery: { count: overrides.count } } }
      : {}),
  },
  fields: {
    agent_id: [agentId],
    'agent.id': [agentId],
    ...(overrides.completedAt ? { completed_at: [overrides.completedAt] } : {}),
    ...(overrides.errorKeyword ? { 'error.keyword': [overrides.errorKeyword] } : {}),
    ...(overrides.errorValue ? { error: [overrides.errorValue] } : {}),
    ...(overrides.errorSkipped ? { 'error.skipped': [overrides.errorSkipped] } : {}),
  },
});

describe('transformStatusEdgesToRecords', () => {
  const agentNameMap = new Map([
    ['agent-1', 'host-alpha'],
    ['agent-2', 'host-beta'],
  ]);

  it('should transform a successful edge', () => {
    const edges = [createEdge('agent-1', { completedAt: '2025-01-20T00:00:00Z', count: 10 })];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
    });

    expect(records).toHaveLength(1);
    expect(records[0].flattened.status).toBe('success');
    expect(records[0].flattened.agent_id).toBe('host-alpha');
    expect(records[0].flattened['action_response.osquery.count']).toBe(10);
    expect(records[0].flattened.error).toBe('');
    expect(records[0].id).toBe('result-agent-1');
  });

  it('should return "error" status when error.keyword is present', () => {
    const edges = [
      createEdge('agent-1', {
        completedAt: '2025-01-20T00:00:00Z',
        errorKeyword: 'Query failed',
        errorValue: 'Query failed',
      }),
    ];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
    });

    expect(records[0].flattened.status).toBe('error');
    expect(records[0].flattened.error).toBe('Query failed');
  });

  it('should return "pending" status when not completed and not expired', () => {
    const edges = [createEdge('agent-2')];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
    });

    expect(records[0].flattened.status).toBe('pending');
    expect(records[0].flattened.agent_id).toBe('host-beta');
  });

  it('should return "expired" status when not completed and expired', () => {
    const edges = [createEdge('agent-1')];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: true,
    });

    expect(records[0].flattened.status).toBe('expired');
  });

  it('should return "skipped" status when error.skipped is present', () => {
    const edges = [createEdge('agent-1', { errorSkipped: 'Agent offline' })];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
    });

    expect(records[0].flattened.status).toBe('skipped');
  });

  it('should return "skipped" when action-level error is set and agent has not completed', () => {
    const edges = [createEdge('agent-1')];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
      error: 'Action failed',
    });

    expect(records[0].flattened.status).toBe('skipped');
  });

  it('should fall back to agent ID when name is not in map', () => {
    const edges = [createEdge('unknown-agent', { completedAt: '2025-01-20T00:00:00Z' })];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
    });

    expect(records[0].flattened.agent_id).toBe('unknown-agent');
  });

  it('should display "-" when count is not available', () => {
    const edges = [createEdge('agent-1', { completedAt: '2025-01-20T00:00:00Z' })];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
    });

    expect(records[0].flattened['action_response.osquery.count']).toBe('-');
  });

  it('should handle empty edges array', () => {
    const records = transformStatusEdgesToRecords({
      edges: [],
      agentNameMap,
      expired: false,
    });

    expect(records).toHaveLength(0);
  });

  it('should preserve raw edge data', () => {
    const edges = [createEdge('agent-1', { completedAt: '2025-01-20T00:00:00Z' })];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
    });

    expect(records[0].raw._id).toBe('result-agent-1');
    expect(records[0].raw._index).toBe('.fleet-actions-results-default');
  });

  it('should store raw agent ID in _raw_agent_id', () => {
    const edges = [createEdge('agent-1', { completedAt: '2025-01-20T00:00:00Z' })];
    const records = transformStatusEdgesToRecords({
      edges,
      agentNameMap,
      expired: false,
    });

    expect(records[0].flattened._raw_agent_id).toBe('agent-1');
  });
});
