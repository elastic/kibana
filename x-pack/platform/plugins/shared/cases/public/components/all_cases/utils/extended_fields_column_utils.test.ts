/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getExtendedFieldDisplayLabels,
  labelFromExtendedFieldKey,
} from './extended_fields_column_utils';

describe('labelFromExtendedFieldKey', () => {
  it('strips trailing As<Type> and start-cases the field name', () => {
    expect(labelFromExtendedFieldKey('summaryAsKeyword')).toBe('Summary');
    expect(labelFromExtendedFieldKey('effortAsInteger')).toBe('Effort');
    expect(labelFromExtendedFieldKey('riskScoreAsKeyword')).toBe('Risk Score');
  });

  it('returns start-cased key when no type suffix matches', () => {
    expect(labelFromExtendedFieldKey('legacyKey')).toBe('Legacy Key');
  });
});

describe('getExtendedFieldDisplayLabels', () => {
  it('returns an empty array when extendedFields is undefined', () => {
    expect(getExtendedFieldDisplayLabels(undefined, undefined)).toEqual([]);
  });

  it('returns an empty array when extendedFields has no keys', () => {
    expect(getExtendedFieldDisplayLabels({}, undefined)).toEqual([]);
  });

  it('falls back to key-derived labels when no labels map is provided', () => {
    expect(
      getExtendedFieldDisplayLabels(
        { summaryAsKeyword: '', effortAsInteger: '5', notesAsKeyword: 'a' },
        undefined
      )
    ).toEqual(['Summary', 'Effort', 'Notes']);
  });

  it('uses server-provided labels when available', () => {
    expect(
      getExtendedFieldDisplayLabels(
        { priority_as_keyword: 'high', effort_as_integer: '3' },
        { priority_as_keyword: 'Priority Level', effort_as_integer: 'Effort Points' }
      )
    ).toEqual(['Priority Level', 'Effort Points']);
  });

  it('falls back to key-derived label for keys missing from the labels map', () => {
    expect(
      getExtendedFieldDisplayLabels(
        { priority_as_keyword: 'high', effort_as_integer: '3' },
        { priority_as_keyword: 'Priority Level' }
      )
    ).toEqual(['Priority Level', 'Effort']);
  });

  it('preserves insertion order of extendedFields keys', () => {
    expect(
      getExtendedFieldDisplayLabels(
        { zzz_as_keyword: 'a', aaa_as_keyword: 'b' },
        { zzz_as_keyword: 'Zzz Label', aaa_as_keyword: 'Aaa Label' }
      )
    ).toEqual(['Zzz Label', 'Aaa Label']);
  });
});
