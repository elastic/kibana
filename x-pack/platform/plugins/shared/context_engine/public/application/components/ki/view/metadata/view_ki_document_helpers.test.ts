/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LAST_SEEN_AT_ATTRIBUTE,
  RELATIONSHIP_KEY_ATTRIBUTE,
} from '../../../../../../common/dreaming';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import {
  documentAttributesToRows,
  formatKiJsonValueAsString,
  groupKiReferences,
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
      { key: 'region', label: 'region', value: 'us-east', isDate: false },
      { key: 'count', label: 'count', value: '3', isDate: false },
      { key: 'enabled', label: 'enabled', value: 'true', isDate: false },
      { key: 'tags', label: 'tags', value: 'a, b', isDate: false },
    ]);
  });

  it('uses readable labels and marks date attributes', () => {
    expect(
      documentAttributesToRows({
        attributes: {
          [LAST_SEEN_AT_ATTRIBUTE]: '2026-01-15T12:00:00.000Z',
          'memory.number_of_occurrences': 5,
        },
      })
    ).toEqual([
      {
        key: LAST_SEEN_AT_ATTRIBUTE,
        label: 'Last seen',
        value: '2026-01-15T12:00:00.000Z',
        isDate: true,
      },
      {
        key: 'memory.number_of_occurrences',
        label: 'Occurrences',
        value: '5',
        isDate: false,
      },
    ]);
  });

  it('omits hidden attributes', () => {
    expect(
      documentAttributesToRows({
        attributes: {
          [RELATIONSHIP_KEY_ATTRIBUTE]: 'a|b|c',
          region: 'us-east',
        },
      })
    ).toEqual([{ key: 'region', label: 'region', value: 'us-east', isDate: false }]);
  });

  it('returns an empty array when attributes are missing or not an object', () => {
    expect(documentAttributesToRows({})).toEqual([]);
    expect(
      documentAttributesToRows({
        attributes: [] as unknown as KiDocument['attributes'],
      })
    ).toEqual([]);
  });
});

describe('groupKiReferences', () => {
  it('returns no groups when references are missing or empty', () => {
    expect(groupKiReferences(undefined)).toEqual([]);
    expect(groupKiReferences([])).toEqual([]);
  });

  it('groups references by relation in a fixed order', () => {
    expect(
      groupKiReferences([
        { uri: 'ki://old', relation: 'supersedes' },
        { uri: 'ki://a', relation: 'relates_to', description: 'from' },
        { uri: 'trace://t1', relation: 'derived_from' },
        { uri: 'ki://m1', relation: 'derived_from' },
        { uri: 'conversation://c1', relation: 'derived_from' },
        { uri: 'ki://b', relation: 'relates_to', description: 'to' },
      ])
    ).toEqual([
      {
        relation: 'derived_from',
        items: [
          { uri: 'ki://m1', kiId: 'm1' },
          { uri: 'conversation://c1', conversationId: 'c1' },
        ],
      },
      {
        relation: 'relates_to',
        items: [
          { uri: 'ki://a', description: 'from', kiId: 'a' },
          { uri: 'ki://b', description: 'to', kiId: 'b' },
        ],
      },
      { relation: 'supersedes', items: [{ uri: 'ki://old', kiId: 'old' }] },
    ]);
  });

  it('skips references without a uri or with an unknown relation', () => {
    expect(
      groupKiReferences([
        { relation: 'derived_from' },
        { uri: 'ki://a', relation: 'unknown' },
        { uri: 'ki://b' },
      ])
    ).toEqual([]);
  });
});
