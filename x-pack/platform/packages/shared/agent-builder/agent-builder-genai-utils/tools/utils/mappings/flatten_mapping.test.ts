/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { flattenMapping } from './flatten_mapping';

describe('flattenMapping', () => {
  it('flatten the provided mappings', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        foo: {
          type: 'text',
          properties: {
            bar: { type: 'keyword', boost: 42 },
          },
        },
        obj: {
          type: 'object',
          properties: {
            sub: { type: 'text', ignore_above: 512 },
            nested: { type: 'object', dynamic: true },
          },
        },
      },
    };

    const flattened = flattenMapping(mapping).sort((a, b) => a.path.localeCompare(b.path));

    expect(flattened).toEqual([
      {
        meta: {},
        searchable: true,
        path: 'foo',
        type: 'text',
      },
      {
        meta: {},
        searchable: true,
        path: 'foo.bar',
        type: 'keyword',
      },
      {
        meta: {},
        searchable: true,
        path: 'obj',
        type: 'object',
      },
      {
        meta: {},
        searchable: true,
        path: 'obj.nested',
        type: 'object',
      },
      {
        meta: {},
        searchable: true,
        path: 'obj.sub',
        type: 'text',
      },
    ]);
  });

  it('preserves the field meta', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        foo: {
          type: 'text',
          meta: { description: 'some desc' },
        },
        bar: {
          type: 'object',
          properties: {
            sub: { type: 'text', meta: { other: 'other' } },
          },
        },
      },
    };

    const flattened = flattenMapping(mapping).sort((a, b) => a.path.localeCompare(b.path));

    expect(flattened).toEqual([
      {
        meta: {},
        searchable: true,
        path: 'bar',
        type: 'object',
      },
      {
        meta: {
          other: 'other',
        },
        searchable: true,
        path: 'bar.sub',
        type: 'text',
      },
      {
        meta: {
          description: 'some desc',
        },
        searchable: true,
        path: 'foo',
        type: 'text',
      },
    ]);
  });

  it('flattens multi-fields defined under the fields property', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        body: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
            semantic_elser: {
              type: 'semantic_text',
            },
          },
        },
        title: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
          },
          properties: {
            sub: { type: 'integer' },
          },
        },
      },
    };

    const flattened = flattenMapping(mapping).sort((a, b) => a.path.localeCompare(b.path));

    expect(flattened).toEqual([
      {
        meta: {},
        searchable: true,
        path: 'body',
        type: 'text',
      },
      {
        meta: {},
        searchable: true,
        path: 'body.keyword',
        type: 'keyword',
      },
      {
        meta: {},
        searchable: true,
        path: 'body.semantic_elser',
        type: 'semantic_text',
      },
      {
        meta: {},
        searchable: true,
        path: 'title',
        type: 'text',
      },
      {
        meta: {},
        searchable: true,
        path: 'title.raw',
        type: 'keyword',
      },
      {
        meta: {},
        searchable: true,
        path: 'title.sub',
        type: 'integer',
      },
    ]);
  });

  it('marks fields with index: false as not searchable', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        searchable_field: {
          type: 'text',
        },
        non_searchable_field: {
          type: 'text',
          index: false,
        },
      },
    };

    const flattened = flattenMapping(mapping).sort((a, b) => a.path.localeCompare(b.path));

    expect(flattened).toEqual([
      {
        meta: {},
        searchable: false,
        path: 'non_searchable_field',
        type: 'text',
      },
      {
        meta: {},
        searchable: true,
        path: 'searchable_field',
        type: 'text',
      },
    ]);
  });

  it('keeps internal fields', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        foo: {
          type: 'text',
        },
        _internal: {
          type: 'keyword',
        },
      },
    };

    const flattened = flattenMapping(mapping).sort((a, b) => a.path.localeCompare(b.path));

    expect(flattened).toEqual([
      {
        meta: {},
        searchable: true,
        path: '_internal',
        type: 'keyword',
      },
      {
        meta: {},
        searchable: true,
        path: 'foo',
        type: 'text',
      },
    ]);
  });
});
