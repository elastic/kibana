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
});
