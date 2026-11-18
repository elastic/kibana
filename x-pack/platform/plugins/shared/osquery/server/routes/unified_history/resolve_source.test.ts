/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LiveHistoryRow } from '../../../common/api/unified_history/types';
import type { LiveActionHit } from './map_live_hit_to_row';
import { buildSourceClause, resolveSource } from './resolve_source';

describe('resolveSource', () => {
  test.each<{ name: string; hit: LiveActionHit; expected: LiveHistoryRow['source'] }>([
    { name: 'empty legacy hit', hit: {}, expected: 'Live' },
    { name: 'legacy source without alerts', hit: { _source: {} }, expected: 'Live' },
    { name: 'empty alerts', hit: { _source: { alert_ids: [] } }, expected: 'Live' },
    { name: 'legacy alerts', hit: { _source: { alert_ids: ['alert-1'] } }, expected: 'Rule' },
    { name: 'field alerts', hit: { fields: { alert_ids: ['alert-1'] } }, expected: 'Rule' },
    { name: 'scalar field alert', hit: { fields: { alert_ids: 'alert-1' } }, expected: 'Rule' },
    {
      name: 'fields override source alerts',
      hit: { fields: { alert_ids: [] }, _source: { alert_ids: ['alert-1'] } },
      expected: 'Live',
    },
    {
      name: 'workflow source',
      hit: { _source: { origin: { type: 'workflow' } } },
      expected: 'Workflow',
    },
    {
      name: 'workflow wins over source alerts',
      hit: { _source: { origin: { type: 'workflow' }, alert_ids: ['alert-1'] } },
      expected: 'Workflow',
    },
    {
      name: 'workflow wins over field alerts',
      hit: { fields: { 'origin.type': ['workflow'], alert_ids: ['alert-1'] } },
      expected: 'Workflow',
    },
    {
      name: 'scalar workflow field',
      hit: { fields: { 'origin.type': 'workflow' } },
      expected: 'Workflow',
    },
    {
      name: 'fields override source marker',
      hit: { fields: { 'origin.type': ['other'] }, _source: { origin: { type: 'workflow' } } },
      expected: 'Live',
    },
    {
      name: 'unknown marker falls back to alerts',
      hit: { _source: { origin: { type: 'other' }, alert_ids: ['alert-1'] } },
      expected: 'Rule',
    },
    {
      name: 'unknown marker without alerts',
      hit: { _source: { origin: { type: 'other' } } },
      expected: 'Live',
    },
  ])('$name resolves to $expected', ({ hit, expected }) => {
    expect(resolveSource(hit)).toBe(expected);
  });
});

describe('buildSourceClause', () => {
  test('workflow matches the persisted marker', () => {
    expect(buildSourceClause('workflow')).toEqual({ term: { 'origin.type': 'workflow' } });
  });

  test('rule requires alerts and excludes workflow actions', () => {
    expect(buildSourceClause('rule')).toEqual({
      bool: {
        filter: [{ exists: { field: 'alert_ids' } }],
        must_not: [{ term: { 'origin.type': 'workflow' } }],
      },
    });
  });

  test('live excludes both alerts and workflow actions', () => {
    expect(buildSourceClause('live')).toEqual({
      bool: {
        must_not: [{ exists: { field: 'alert_ids' } }, { term: { 'origin.type': 'workflow' } }],
      },
    });
  });
});
