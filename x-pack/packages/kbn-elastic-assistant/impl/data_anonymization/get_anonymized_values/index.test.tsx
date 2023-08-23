/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnonymizedValues } from '.';
import { mockGetAnonymizedValue } from '../../mock/get_anonymized_value';

describe('getAnonymizedValues', () => {
  it('returns empty anonymizedValues and replacements when provided with empty raw data', () => {
    const result = getAnonymizedValues({
      allowReplacementSet: new Set(),
      allowSet: new Set(),
      currentReplacements: {},
      field: 'test.field',
      getAnonymizedValue: jest.fn(),
      rawData: {},
    });

    expect(result).toEqual({
      anonymizedValues: [],
      replacements: {},
    });
  });

  it('returns the expected anonymized values', () => {
    const rawData = {
      'test.field': ['test1', 'test2'],
    };

    const result = getAnonymizedValues({
      allowReplacementSet: new Set(['test.field']),
      allowSet: new Set(['test.field']),
      currentReplacements: {},
      field: 'test.field',
      getAnonymizedValue: mockGetAnonymizedValue,
      rawData,
    });

    expect(result.anonymizedValues).toEqual(['1tset', '2tset']);
  });

  it('returns the expected replacements', () => {
    const rawData = {
      'test.field': ['test1', 'test2'],
    };

    const result = getAnonymizedValues({
      allowReplacementSet: new Set(['test.field']),
      allowSet: new Set(['test.field']),
      currentReplacements: {},
      field: 'test.field',
      getAnonymizedValue: mockGetAnonymizedValue,
      rawData,
    });

    expect(result.replacements).toEqual({
      '1tset': 'test1',
      '2tset': 'test2',
    });
  });

  it('returns non-anonymized values when the field is not a member of the `allowReplacementSet`', () => {
    const rawData = {
      'test.field': ['test1', 'test2'],
    };

    const result = getAnonymizedValues({
      allowReplacementSet: new Set(), // does NOT include `test.field`
      allowSet: new Set(['test.field']),
      currentReplacements: {},
      field: 'test.field',
      getAnonymizedValue: mockGetAnonymizedValue,
      rawData,
    });

    expect(result.anonymizedValues).toEqual(['test1', 'test2']); // no anonymization
  });

  it('does NOT allow a field to be included in `anonymizedValues` when the field is not a member of the `allowSet`', () => {
    const rawData = {
      'test.field': ['test1', 'test2'],
    };

    const result = getAnonymizedValues({
      allowReplacementSet: new Set(['test.field']),
      allowSet: new Set(), // does NOT include `test.field`
      currentReplacements: {},
      field: 'test.field',
      getAnonymizedValue: mockGetAnonymizedValue,
      rawData,
    });

    expect(result.anonymizedValues).toEqual([]);
  });
});
