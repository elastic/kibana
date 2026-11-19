/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getField, mapLiveHitToRow } from './map_live_hit_to_row';

describe('getField', () => {
  test('returns value from hit.fields, unwrapping single-element arrays', () => {
    expect(getField({ action_id: ['abc-123'] }, {}, 'action_id')).toBe('abc-123');
  });

  test('returns scalar value from hit.fields when not an array', () => {
    expect(getField({ action_id: 'scalar-value' }, {}, 'action_id')).toBe('scalar-value');
  });

  test('falls back to _source when hit.fields does not have the key', () => {
    expect(getField({}, { user_id: 'user-1' }, 'user_id')).toBe('user-1');
  });

  test('walks dotted paths in _source', () => {
    expect(getField({}, { data: { query: 'SELECT 1' } }, 'data.query')).toBe('SELECT 1');
  });

  test('returns undefined for missing fields', () => {
    expect(getField({}, {}, 'nonexistent')).toBeUndefined();
  });

  test('prefers hit.fields over _source', () => {
    expect(
      getField({ action_id: ['from-fields'] }, { action_id: 'from-source' }, 'action_id')
    ).toBe('from-fields');
  });
});

describe('mapLiveHitToRow', () => {
  test('maps a basic live action hit to a row', () => {
    const hit = {
      _source: {
        action_id: 'action-1',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        user_id: 'user-1',
        queries: [{ query: 'SELECT * FROM processes', id: 'q1', agents: ['agent-1', 'agent-2'] }],
      },
    };

    const row = mapLiveHitToRow(hit);

    expect(row.id).toBe('action-1');
    expect(row.sourceType).toBe('live');
    expect(row.source).toBe('Live');
    expect(row.agentCount).toBe(2);
  });

  test('extracts query details for single (non-pack) queries', () => {
    const hit = {
      _source: {
        action_id: 'action-details',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        agent_ids: ['agent-1', 'agent-2'],
        agent_all: true,
        agent_platforms: ['linux'],
        agent_policy_ids: ['policy-1'],
        queries: [
          {
            query: 'SELECT * FROM processes',
            id: 'q1',
            agents: ['agent-1', 'agent-2'],
            ecs_mapping: { 'process.name': { field: 'name' } },
            saved_query_id: 'saved-123',
            timeout: 30,
          },
        ],
      },
    };

    const row = mapLiveHitToRow(hit);

    expect(row.queryText).toBe('SELECT * FROM processes');
    expect(row.ecsMapping).toEqual({ 'process.name': { field: 'name' } });
    expect(row.savedQueryId).toBe('saved-123');
    expect(row.timeout).toBe(30);
    expect(row.agentIds).toEqual(['agent-1', 'agent-2']);
    expect(row.agentAll).toBe(true);
    expect(row.agentPlatforms).toEqual(['linux']);
    expect(row.agentPolicyIds).toEqual(['policy-1']);
  });

  test('does not extract query-level details for pack queries', () => {
    const hit = {
      _source: {
        action_id: 'action-pack',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        pack_id: 'pack-1',
        pack_name: 'my_pack',
        agent_ids: ['agent-1'],
        queries: [
          {
            query: 'SELECT 1',
            id: 'q1',
            agents: ['agent-1'],
            ecs_mapping: { 'host.name': { field: 'hostname' } },
            saved_query_id: 'saved-1',
            timeout: 60,
          },
          {
            query: 'SELECT 2',
            id: 'q2',
            agents: ['agent-1'],
          },
        ],
      },
    };

    const row = mapLiveHitToRow(hit);

    expect(row.queryText).toBe('');
    expect(row.packId).toBe('pack-1');
    expect(row.ecsMapping).toBeUndefined();
    expect(row.savedQueryId).toBeUndefined();
    expect(row.timeout).toBeUndefined();
    // Agent selection is still populated for packs
    expect(row.agentIds).toEqual(['agent-1']);
  });

  test('detects Rule source when alert_ids is present', () => {
    const hit = {
      _source: {
        action_id: 'action-2',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        alert_ids: ['alert-1'],
        queries: [{ query: 'SELECT 1', id: 'q1', agents: ['agent-1'] }],
      },
    };

    expect(mapLiveHitToRow(hit).source).toBe('Rule');
  });

  test('sets empty queryText for pack queries (multiple queries)', () => {
    const hit = {
      _source: {
        action_id: 'action-3',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        pack_name: 'my_pack',
        queries: [
          { query: 'SELECT 1', id: 'q1', agents: ['agent-1'] },
          { query: 'SELECT 2', id: 'q2', agents: ['agent-2'] },
        ],
      },
    };

    const row = mapLiveHitToRow(hit);
    expect(row.queryText).toBe('');
    expect(row.packName).toBe('my_pack');
  });

  test('handles empty hit gracefully', () => {
    const row = mapLiveHitToRow({});
    expect(row.sourceType).toBe('live');
    expect(row.agentCount).toBe(0);
    expect(row.tags).toEqual([]);
  });

  test('maps tags from source', () => {
    const hit = {
      _source: {
        action_id: 'action-tags',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        tags: ['important', 'reviewed'],
        queries: [{ query: 'SELECT 1', id: 'q1', agents: ['agent-1'] }],
      },
    };

    const row = mapLiveHitToRow(hit);
    expect(row.tags).toEqual(['important', 'reviewed']);
  });

  test('handles old action docs without agent selection fields', () => {
    const hit = {
      _source: {
        action_id: 'old-action',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        agents: ['agent-1'],
        queries: [{ query: 'SELECT * FROM os_version;', id: 'q1', agents: ['agent-1'] }],
      },
    };

    const row = mapLiveHitToRow(hit);

    expect(row.agentCount).toBe(1);
    expect(row.agentIds).toBeUndefined();
    expect(row.agentAll).toBeUndefined();
    expect(row.agentPlatforms).toBeUndefined();
    expect(row.agentPolicyIds).toBeUndefined();
  });

  test('defaults tags to empty array when missing', () => {
    const hit = {
      _source: {
        action_id: 'action-no-tags',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        queries: [{ query: 'SELECT 1', id: 'q1', agents: ['agent-1'] }],
      },
    };

    const row = mapLiveHitToRow(hit);
    expect(row.tags).toEqual([]);
  });

  test('maps replay parameters for single query (savedQueryId, timeout, ecsMapping, agent selection)', () => {
    const hit = {
      _source: {
        action_id: 'action-replay',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        agent_all: true,
        agent_ids: ['agent-1', 'agent-2'],
        agent_platforms: ['linux', 'darwin'],
        agent_policy_ids: ['policy-1'],
        queries: [
          {
            query: 'SELECT * FROM uptime',
            id: 'q1',
            agents: ['agent-1', 'agent-2'],
            saved_query_id: 'saved-query-123',
            timeout: 601,
            ecs_mapping: { message: { field: 'days' } },
          },
        ],
      },
    };

    const row = mapLiveHitToRow(hit);
    expect(row.savedQueryId).toBe('saved-query-123');
    expect(row.timeout).toBe(601);
    expect(row.ecsMapping).toEqual({ message: { field: 'days' } });
    expect(row.agentIds).toEqual(['agent-1', 'agent-2']);
    expect(row.agentAll).toBe(true);
    expect(row.agentPlatforms).toEqual(['linux', 'darwin']);
    expect(row.agentPolicyIds).toEqual(['policy-1']);
  });

  test('does not map replay parameters for pack queries', () => {
    const hit = {
      _source: {
        action_id: 'action-pack',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        pack_id: 'pack-1',
        pack_name: 'my_pack',
        queries: [
          {
            query: 'SELECT 1',
            id: 'q1',
            agents: ['agent-1'],
            saved_query_id: 'sq-1',
            timeout: 300,
          },
          { query: 'SELECT 2', id: 'q2', agents: ['agent-1'] },
        ],
      },
    };

    const row = mapLiveHitToRow(hit);
    expect(row.savedQueryId).toBeUndefined();
    expect(row.timeout).toBeUndefined();
    expect(row.ecsMapping).toBeUndefined();
  });
});
