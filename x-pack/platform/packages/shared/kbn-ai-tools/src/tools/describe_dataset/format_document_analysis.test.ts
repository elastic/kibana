/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from './document_analysis';
import { formatDocumentAnalysis } from './format_document_analysis';

// disable shuffle to get deterministic results
jest.mock('lodash', () => {
  const actual = jest.requireActual<typeof import('lodash')>('lodash');
  return {
    ...actual,
    shuffle: jest.fn((value: unknown[]) => value),
  };
});

describe('formatDocumentAnalysis', () => {
  it('creates a nested object with value distributions and missing coverage', () => {
    const analysis: DocumentAnalysis = {
      total: 100,
      sampled: 3,
      fields: [
        {
          name: 'host.name',
          types: ['text'],
          cardinality: 3,
          values: [
            { value: 'web-01', count: 2 },
            { value: 'web-02', count: 1 },
            { value: 'web-03', count: 1 },
          ],
          empty: false,
          documentsWithValue: 3,
        },
        {
          name: 'host.ip',
          types: ['keyword'],
          cardinality: 2,
          values: [
            { value: '10.0.0.1', count: 2 },
            { value: '10.0.0.2', count: 1 },
          ],
          empty: false,
          documentsWithValue: 2,
        },
      ],
    };

    const result = formatDocumentAnalysis(analysis, { limit: 2 });

    expect(result).toEqual({
      total: 100,
      sampled: 3,
      fields: {
        'host.name (text)': ['web-01 (67%)', 'web-02 (33%)', '... (+1 more)'],
        'host.ip (keyword)': ['10.0.0.1 (67%)', '10.0.0.2 (33%)', '(no value) (33%)'],
      },
    });
  });

  it('supports fields that are both leaves and have nested sub-fields', () => {
    const analysis: DocumentAnalysis = {
      total: 20,
      sampled: 2,
      fields: [
        {
          name: 'attribute.a',
          types: ['keyword'],
          cardinality: 1,
          values: [{ value: 'foo', count: 2 }],
          empty: false,
          documentsWithValue: 2,
        },
        {
          name: 'attribute.a.b',
          types: ['keyword'],
          cardinality: 1,
          values: [{ value: 'bar', count: 1 }],
          empty: false,
          documentsWithValue: 1,
        },
      ],
    };

    const result = formatDocumentAnalysis(analysis, { limit: 10 });

    expect(result).toEqual({
      total: 20,
      sampled: 2,
      fields: {
        'attribute.a (keyword)': ['foo (100%)'],
        'attribute.a.b (keyword)': ['bar (50%)', '(no value) (50%)'],
      },
    });
  });
});
