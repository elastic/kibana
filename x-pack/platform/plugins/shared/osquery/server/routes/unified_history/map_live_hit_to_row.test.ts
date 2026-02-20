/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getField, mapLiveHitToRow } from './map_live_hit_to_row';

describe('getField', () => {
  test('returns value from hit.fields, unwrapping single-element arrays', () => {
    const hitFields = { action_id: ['abc-123'] };
    const source = {};

    expect(getField(hitFields, source, 'action_id')).toBe('abc-123');
  });

  test('returns scalar value from hit.fields without unwrapping', () => {
    const hitFields = { action_id: 'abc-123' };
    const source = {};

    expect(getField(hitFields, source, 'action_id')).toBe('abc-123');
  });

  test('falls back to _source when hit.fields does not have the key', () => {
    const hitFields = {};
    const source = { user_id: 'user-1' };

    expect(getField(hitFields, source, 'user_id')).toBe('user-1');
  });

  test('walks dotted paths in _source (e.g. "data.query")', () => {
    const hitFields = {};
    const source = { data: { query: 'SELECT 1' } };

    expect(getField(hitFields, source, 'data.query')).toBe('SELECT 1');
  });

  test('unwraps arrays in _source fallback', () => {
    const hitFields = {};
    const source = { tags: ['tag1', 'tag2'] };

    expect(getField(hitFields, source, 'tags')).toBe('tag1');
  });

  test('returns undefined for missing fields in both hit.fields and _source', () => {
    const hitFields = {};
    const source = {};

    expect(getField(hitFields, source, 'nonexistent')).toBeUndefined();
  });

  test('returns undefined when dotted path traverses a non-object', () => {
    const hitFields = {};
    const source = { data: 'string_value' };

    expect(getField(hitFields, source, 'data.nested')).toBeUndefined();
  });

  test('returns undefined when dotted path traverses null', () => {
    const hitFields = {};
    const source = { data: null };

    expect(getField(hitFields, source, 'data.nested')).toBeUndefined();
  });

  test('prefers hit.fields over _source', () => {
    const hitFields = { action_id: ['from-fields'] };
    const source = { action_id: 'from-source' };

    expect(getField(hitFields, source, 'action_id')).toBe('from-fields');
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
    expect(row.rowType).toBe('live');
    expect(row.timestamp).toBe('2024-01-01T00:00:00.000Z');
    expect(row.queryText).toBe('SELECT * FROM processes');
    expect(row.source).toBe('Live');
    expect(row.agentCount).toBe(2);
    expect(row.successCount).toBeUndefined();
    expect(row.errorCount).toBeUndefined();
    expect(row.totalRows).toBeUndefined();
    expect(row.userId).toBe('user-1');
    expect(row.actionId).toBe('action-1');
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

    const row = mapLiveHitToRow(hit);

    expect(row.source).toBe('Rule');
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

  test('uses top-level agents field when available', () => {
    const hit = {
      _source: {
        action_id: 'action-4',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        agents: ['a1', 'a2', 'a3'],
        queries: [{ query: 'SELECT 1', id: 'q1' }],
      },
    };

    const row = mapLiveHitToRow(hit);

    expect(row.agentCount).toBe(3);
  });

  test('sums agent counts from sub-queries when top-level agents is empty', () => {
    const hit = {
      _source: {
        action_id: 'action-5',
        '@timestamp': '2024-01-01T00:00:00.000Z',
        queries: [
          { query: 'SELECT 1', id: 'q1', agents: ['a1', 'a2'] },
          { query: 'SELECT 2', id: 'q2', agents: ['a3'] },
        ],
      },
    };

    const row = mapLiveHitToRow(hit);

    expect(row.agentCount).toBe(3);
  });

  test('handles hit with fields format (ES fields API returns arrays)', () => {
    const hit = {
      fields: {
        action_id: ['action-6'],
        '@timestamp': ['2024-01-01T00:00:00.000Z'],
        user_id: ['user-1'],
      },
      _source: {
        queries: [{ query: 'SELECT 1', id: 'q1', agents: ['agent-1'] }],
      },
    };

    const row = mapLiveHitToRow(hit);

    expect(row.id).toBe('action-6');
    expect(row.userId).toBe('user-1');
  });

  test('handles empty hit gracefully', () => {
    const hit = {};

    const row = mapLiveHitToRow(hit);

    expect(row.rowType).toBe('live');
    expect(row.agentCount).toBe(0);
    expect(row.queryText).toBe('');
    expect(row.successCount).toBeUndefined();
    expect(row.errorCount).toBeUndefined();
    expect(row.totalRows).toBeUndefined();
  });
});
