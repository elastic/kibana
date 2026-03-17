/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingsResponse } from '../../../../../../../common';
import { countVectorBasedTypesFromMappings } from './mappings_convertor';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

const createMappingsResponse = (
  properties: MappingTypeMapping['properties']
): MappingsResponse => ({
  mappings: { properties },
});

describe('countVectorBasedTypesFromMappings', () => {
  test('returns zeros when there are no vector fields', () => {
    const mappings = createMappingsResponse({
      title: { type: 'text' },
      age: { type: 'integer' },
    });

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 0,
      dense_vector: 0,
      sparse_vector: 0,
    });
  });

  test('counts top-level vector fields', () => {
    const mappings = createMappingsResponse({
      content: { type: 'semantic_text' },
      embedding: { type: 'dense_vector' },
      tokens: { type: 'sparse_vector' },
      title: { type: 'text' },
    });

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 1,
      dense_vector: 1,
      sparse_vector: 1,
    });
  });

  test('counts multiple fields of the same type', () => {
    const mappings = createMappingsResponse({
      content_a: { type: 'semantic_text' },
      content_b: { type: 'semantic_text' },
      content_c: { type: 'semantic_text' },
    });

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 3,
      dense_vector: 0,
      sparse_vector: 0,
    });
  });

  test('counts vector fields nested inside object properties', () => {
    const mappings = createMappingsResponse({
      metadata: {
        properties: {
          embedding: { type: 'dense_vector' },
          name: { type: 'keyword' },
        },
      },
    });

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 0,
      dense_vector: 1,
      sparse_vector: 0,
    });
  });

  test('counts vector fields in deeply nested structures', () => {
    const mappings = createMappingsResponse({
      level1: {
        properties: {
          level2: {
            properties: {
              level3: {
                properties: {
                  deep_embedding: { type: 'dense_vector' },
                },
              },
            },
          },
        },
      },
    });

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 0,
      dense_vector: 1,
      sparse_vector: 0,
    });
  });

  test('counts vector fields inside multi-fields (fields key)', () => {
    // Multi-fields are flat records without a `properties` wrapper.
    // Currently, vector types can not be defined as multi-fields, but
    // we are still checking for them in case this is ever changed in the future.
    const mappings = createMappingsResponse({
      content: {
        type: 'text',
        fields: {
          semantic: { type: 'semantic_text' },
          vector: { type: 'dense_vector' },
        },
      },
    });

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 1,
      dense_vector: 1,
      sparse_vector: 0,
    });
  });

  test('counts across mixed nesting of properties and objects', () => {
    const mappings = createMappingsResponse({
      top_semantic: { type: 'semantic_text' },
      nested_obj: {
        properties: {
          inner_sparse: { type: 'sparse_vector' },
          deeper: {
            properties: {
              dense: { type: 'dense_vector' },
            },
          },
        },
      },
    });

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 1,
      dense_vector: 1,
      sparse_vector: 1,
    });
  });

  test('returns zeros for empty mappings', () => {
    const mappings: MappingsResponse = {
      mappings: { properties: {} },
    };

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 0,
      dense_vector: 0,
      sparse_vector: 0,
    });
  });

  test('handles mappings with no properties key', () => {
    const mappings: MappingsResponse = {
      mappings: {},
    };

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 0,
      dense_vector: 0,
      sparse_vector: 0,
    });
  });

  test('ignores non-vector field types', () => {
    const mappings = createMappingsResponse({
      name: { type: 'keyword' },
      description: { type: 'text' },
      count: { type: 'long' },
      location: { type: 'geo_point' },
      created: { type: 'date' },
      embedding: { type: 'dense_vector' },
    });

    expect(countVectorBasedTypesFromMappings(mappings)).toEqual({
      semantic_text: 0,
      dense_vector: 1,
      sparse_vector: 0,
    });
  });
});
