/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LiveHistoryRow } from '../../../common/api/unified_history/types';
import type { LiveActionHit } from './map_live_hit_to_row';
import { buildSourceClause, resolveSource } from './resolve_source';

interface TestClause {
  term?: Record<string, string | { value: string }>;
  exists?: { field: string };
  bool?: { filter?: TestClause | TestClause[]; must_not?: TestClause | TestClause[] };
}

const matchesClause = (
  clause: TestClause,
  document: Record<string, string | string[] | undefined>
): boolean => {
  if (clause.term) {
    return Object.entries(clause.term).every(([field, term]) => {
      const expected = typeof term === 'object' ? term.value : term;
      const value = document[field];

      return Array.isArray(value) ? value.some((entry) => entry === expected) : value === expected;
    });
  }

  if (clause.exists) {
    const value = document[clause.exists.field];

    // Elasticsearch does not index a value for an empty array.
    return Array.isArray(value) ? value.length > 0 : value != null;
  }

  if (clause.bool) {
    const { filter = [], must_not = [], ...unsupported } = clause.bool;
    if (Object.keys(unsupported).length > 0) {
      throw new Error('Unsupported test bool clause');
    }

    const required = Array.isArray(filter) ? filter : [filter];
    const excluded = Array.isArray(must_not) ? must_not : [must_not];

    return (
      required.every((child) => matchesClause(child, document)) &&
      excluded.every((child) => !matchesClause(child, document))
    );
  }

  throw new Error('Unsupported test clause');
};

describe.each(['fields', '_source'] as const)('source partition using %s', (representation) => {
  test.each<{
    originType?: string;
    alertIds?: string[];
    expected: LiveHistoryRow['source'];
  }>([
    { originType: 'workflow', alertIds: ['alert-1'], expected: 'Workflow' },
    { originType: 'workflow', alertIds: [], expected: 'Workflow' },
    { originType: 'workflow', expected: 'Workflow' },
    { originType: 'future_type', alertIds: ['alert-1'], expected: 'Rule' },
    { originType: 'future_type', alertIds: [], expected: 'Live' },
    { originType: 'future_type', expected: 'Live' },
    { alertIds: ['alert-1'], expected: 'Rule' },
    { alertIds: [], expected: 'Live' },
    { expected: 'Live' },
  ])(
    'origin=$originType alerts=$alertIds resolves and filters as $expected only',
    ({ originType, alertIds, expected }) => {
      const document = {
        ...(originType === undefined ? {} : { 'origin.type': [originType] }),
        ...(alertIds === undefined ? {} : { alert_ids: alertIds }),
      };
      const hit: LiveActionHit =
        representation === 'fields'
          ? { fields: document }
          : {
              _source: {
                ...(originType === undefined ? {} : { origin: { type: originType } }),
                ...(alertIds === undefined ? {} : { alert_ids: alertIds }),
              },
            };

      expect(resolveSource(hit)).toBe(expected);
      const matchingSources = (['live', 'rule', 'workflow'] as const).filter((source) =>
        matchesClause(buildSourceClause(source) as TestClause, document)
      );
      expect(matchingSources).toEqual([expected.toLowerCase()]);
    }
  );
});

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
