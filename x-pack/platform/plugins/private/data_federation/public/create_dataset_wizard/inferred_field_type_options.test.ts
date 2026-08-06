/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEffectiveAutomaticFieldType,
  INFERRED_FIELD_TYPE_OPTIONS,
  applyAutomaticFieldTypeOverride,
  isAutomaticFieldTypeOverridden,
  pruneAutomaticFieldTypeOverrides,
} from './inferred_field_type_options';

describe('inferred_field_type_options', () => {
  it('includes the full index management main type list plus inferred concrete types', () => {
    expect(INFERRED_FIELD_TYPE_OPTIONS).toEqual(
      expect.arrayContaining(['keyword', 'text', 'numeric', 'long', 'date'])
    );
    expect(INFERRED_FIELD_TYPE_OPTIONS.length).toBeGreaterThan(30);
  });

  it('resolves effective field types with overrides', () => {
    expect(
      getEffectiveAutomaticFieldType({
        fieldName: '@timestamp',
        inferredType: 'date',
        overrides: { '@timestamp': 'keyword' },
      })
    ).toBe('keyword');
  });

  it('prunes overrides for fields that are no longer inferred', () => {
    expect(
      pruneAutomaticFieldTypeOverrides(
        { '@timestamp': 'keyword', removed_field: 'text' },
        ['@timestamp']
      )
    ).toEqual({ '@timestamp': 'keyword' });
  });

  it('stores and clears automatic type overrides', () => {
    expect(
      applyAutomaticFieldTypeOverride({
        overrides: {},
        fieldName: '@timestamp',
        inferredType: 'date',
        nextType: 'keyword',
      })
    ).toEqual({ '@timestamp': 'keyword' });

    expect(
      applyAutomaticFieldTypeOverride({
        overrides: { '@timestamp': 'keyword' },
        fieldName: '@timestamp',
        inferredType: 'date',
        nextType: 'date',
      })
    ).toEqual({});
  });

  it('detects when a field type override is present', () => {
    expect(isAutomaticFieldTypeOverridden({}, '@timestamp')).toBe(false);
    expect(isAutomaticFieldTypeOverridden({ '@timestamp': 'keyword' }, '@timestamp')).toBe(true);
  });
});
