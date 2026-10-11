/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  documentAttributesToRows,
  formatKiJsonValueAsString,
  readKiGovernance,
} from './view_ki_document_helpers';

describe('readKiGovernance', () => {
  it('accepts string provenance writers', () => {
    expect(
      readKiGovernance({
        governance: { provenance: { created_by: 'workflow://legacy-wf' } },
      }).createdBy
    ).toEqual({ uri: 'workflow://legacy-wf', metadata: {} });
  });

  it('returns a typed lifecycle status when present', () => {
    expect(
      readKiGovernance({
        governance: { lifecycle: { status: 'deleted' } },
      }).lifecycleStatus
    ).toBe('deleted');
    expect(
      readKiGovernance({
        governance: { lifecycle: { status: 'pending' } },
      }).lifecycleStatus
    ).toBeUndefined();
  });
});

describe('formatKiJsonValueAsString', () => {
  it('stringifies primitives and arrays', () => {
    expect(formatKiJsonValueAsString('hello')).toBe('hello');
    expect(formatKiJsonValueAsString(42)).toBe('42');
    expect(formatKiJsonValueAsString(true)).toBe('true');
    expect(formatKiJsonValueAsString(['a', 1, false])).toBe('a, 1, false');
  });

  it('returns empty string for objects', () => {
    expect(formatKiJsonValueAsString({ nested: 'x' })).toBe('');
  });
});

describe('documentAttributesToRows', () => {
  it('maps attribute entries to display rows', () => {
    expect(
      documentAttributesToRows({
        attributes: {
          region: 'us-east',
          count: 3,
          enabled: true,
          tags: ['a', 'b'],
        },
      })
    ).toEqual([
      { key: 'region', value: 'us-east' },
      { key: 'count', value: '3' },
      { key: 'enabled', value: 'true' },
      { key: 'tags', value: 'a, b' },
    ]);
  });

  it('returns an empty array when attributes are missing or not an object', () => {
    expect(documentAttributesToRows({})).toEqual([]);
    expect(documentAttributesToRows({ attributes: [] })).toEqual([]);
  });
});
