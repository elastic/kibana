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
    expect(getExtendedFieldDisplayLabels(undefined)).toEqual([]);
  });

  it('returns an empty array when extendedFields has no keys', () => {
    expect(getExtendedFieldDisplayLabels({})).toEqual([]);
  });

  it('returns sorted display labels for all keys', () => {
    expect(
      getExtendedFieldDisplayLabels({
        summaryAsKeyword: '',
        effortAsInteger: '5',
        notesAsKeyword: 'a',
      })
    ).toEqual(['Effort', 'Notes', 'Summary']);
  });
});
