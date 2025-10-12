/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shuffle } from 'lodash';
import type { DocumentAnalysis } from './document_analysis';
import { sortAndTruncateAnalyzedFields } from './sort_and_truncate_analyzed_fields';

jest.mock('lodash', () => {
  const actual = jest.requireActual<typeof import('lodash')>('lodash');
  return {
    ...actual,
    shuffle: jest.fn((value: unknown[]) => value),
  };
});

describe('sortAndTruncateAnalyzedFields', () => {
  beforeEach(() => {
    (shuffle as jest.Mock).mockClear();
  });

  const analysis: DocumentAnalysis = {
    total: 10,
    sampled: 4,
    fields: [
      {
        name: 'alpha',
        types: ['keyword'],
        cardinality: 2,
        values: [
          { value: 'one', count: 3 },
          { value: 'two', count: 1 },
        ],
        empty: false,
        documentsWithValue: 4,
      },
      {
        name: 'beta',
        types: [],
        cardinality: null,
        values: [],
        empty: true,
        documentsWithValue: 0,
      },
      {
        name: 'gamma',
        types: ['text'],
        cardinality: 3,
        values: [
          { value: 'alpha', count: 2 },
          { value: 'beta', count: 1 },
          { value: 'gamma', count: 1 },
        ],
        empty: false,
        documentsWithValue: 3,
      },
    ],
  };

  it('returns formatted field summaries with counts', () => {
    const result = sortAndTruncateAnalyzedFields(analysis);

    expect(result.fields).toEqual([
      'alpha:keyword - 2 distinct values (`one` (3), `two` (1))',
      'beta (empty)',
      'gamma:text - 3 distinct values (`alpha` (2), `beta` (1), 1 more values)',
    ]);
  });

  it('drops empty and unmapped fields when requested', () => {
    const result = sortAndTruncateAnalyzedFields(analysis, {
      dropEmpty: true,
      dropUnmapped: true,
    });

    expect(result.fields).toEqual([
      'alpha:keyword - 2 distinct values (`one` (3), `two` (1))',
      'gamma:text - 3 distinct values (`alpha` (2), `beta` (1), 1 more values)',
    ]);
  });
});
