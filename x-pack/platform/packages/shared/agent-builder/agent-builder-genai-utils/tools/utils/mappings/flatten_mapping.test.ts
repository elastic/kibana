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
        path: 'foo',
        type: 'text',
      },
      {
        meta: {},
        path: 'foo.bar',
        type: 'keyword',
      },
      {
        meta: {},
        path: 'obj',
        type: 'object',
      },
      {
        meta: {},
        path: 'obj.nested',
        type: 'object',
      },
      {
        meta: {},
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
        path: 'bar',
        type: 'object',
      },
      {
        meta: {
          other: 'other',
        },
        path: 'bar.sub',
        type: 'text',
      },
      {
        meta: {
          description: 'some desc',
        },
        path: 'foo',
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
        path: '_internal',
        type: 'keyword',
      },
      {
        meta: {},
        path: 'foo',
        type: 'text',
      },
    ]);
  });
});
