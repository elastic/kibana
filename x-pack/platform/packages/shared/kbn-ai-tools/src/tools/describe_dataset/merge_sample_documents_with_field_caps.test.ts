/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { mergeSampleDocumentsWithFieldCaps } from './merge_sample_documents_with_field_caps';

const createFieldCaps = (fields: string[]): FieldCapsResponse => {
  return {
    fields: fields.reduce<Record<string, Record<string, unknown>>>((accumulator, field) => {
      accumulator[field] = { keyword: {} };
      return accumulator;
    }, {}),
  } as unknown as FieldCapsResponse;
};

describe('mergeSampleDocumentsWithFieldCaps', () => {
  it('counts documents for multi-valued fields and tracks empty coverage', () => {
    const hits: SearchHit[] = [
      {
        _index: 'test',
        _id: '1',
        _source: {
          attribute: { a: 'foo' },
          tags: ['alpha'],
        },
      } as SearchHit,
      {
        _index: 'test',
        _id: '2',
        _source: {
          attribute: { a: ['foo', 'bar'] },
          tags: ['alpha', 'beta', 'beta'],
          optional: [],
        },
      } as SearchHit,
      {
        _index: 'test',
        _id: '3',
        _source: {
          unrelated: 'value',
        },
      } as SearchHit,
    ];

    const analysis = mergeSampleDocumentsWithFieldCaps({
      total: 100,
      hits,
      fieldCaps: createFieldCaps(['attribute.a', 'tags', 'optional']),
    });

    expect(analysis.total).toBe(100);
    expect(analysis.sampled).toBe(3);

    const attributeField = analysis.fields.find((field) => field.name === 'attribute.a');
    expect(attributeField).toEqual(
      expect.objectContaining({
        types: ['keyword'],
        empty: false,
        cardinality: 2,
        documentsWithValue: 2,
      })
    );

    expect(attributeField?.values).toEqual([
      { value: 'foo', count: 2 },
      { value: 'bar', count: 1 },
    ]);

    const tagsField = analysis.fields.find((field) => field.name === 'tags');
    expect(tagsField).toEqual(
      expect.objectContaining({
        types: ['keyword'],
        empty: false,
        cardinality: 2,
        documentsWithValue: 2,
      })
    );

    expect(tagsField?.values).toEqual([
      { value: 'alpha', count: 2 },
      { value: 'beta', count: 1 },
    ]);

    const optionalField = analysis.fields.find((field) => field.name === 'optional');
    expect(optionalField).toEqual(
      expect.objectContaining({
        empty: true,
        documentsWithValue: 0,
        cardinality: null,
      })
    );

    const dynamicField = analysis.fields.find((field) => field.name === 'unrelated');
    expect(dynamicField).toEqual(
      expect.objectContaining({
        types: [],
        empty: false,
        documentsWithValue: 1,
      })
    );
  });
});
