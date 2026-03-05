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
  });
});
