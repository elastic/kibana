/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { cleanupMapping, flattenMapping } from './mappings';

describe('cleanupMapping', () => {
  it('preserves the top level meta description', () => {
    const mapping: MappingTypeMapping = {
      _meta: {
        description: 'some global description',
        another_meta: 'hello',
      },
      properties: {},
    };

    const cleaned = cleanupMapping(mapping);

    expect(cleaned._meta!).toEqual({ description: 'some global description' });
  });

  it('preserves field-level description meta', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        foo: { type: 'text', meta: { description: 'desc', metaB: 'b' } },
      },
    };

    const cleaned = cleanupMapping(mapping);

    expect(cleaned.properties!.foo.meta).toEqual({ description: 'desc' });
  });

  it('preserves internal fields', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        foo: { type: 'text' },
        _internal: { type: 'keyword' },
      },
    };

    const cleaned = cleanupMapping(mapping);

    expect(Object.keys(cleaned.properties!)).toEqual(['foo', '_internal']);
  });

  it('preserves type, dynamic and index properties on fields', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        foo: { type: 'keyword', index: false },
        bar: { type: 'text', index: true },
        hello: { type: 'object', dynamic: true },
      },
    };

    const cleaned = cleanupMapping(mapping);

    expect(cleaned.properties).toEqual(mapping.properties);
  });

  it('removes unnecessary field properties', () => {
    const mapping: MappingTypeMapping = {
      properties: {
        foo: { type: 'keyword', boost: 12 },
        bar: { type: 'text', ignore_above: 512 },
        hello: { type: 'object', dynamic: true },
      },
    };

    const cleaned = cleanupMapping(mapping);

    expect(cleaned.properties).toEqual({
      foo: { type: 'keyword' },
      bar: { type: 'text' },
      hello: { type: 'object', dynamic: true },
    });
  });

  it('handles nested fields', () => {
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

    const cleaned = cleanupMapping(mapping);

    expect(cleaned.properties).toEqual({
      foo: {
        type: 'text',
        properties: {
          bar: { type: 'keyword' },
        },
      },
      obj: {
        type: 'object',
        properties: {
          sub: { type: 'text' },
          nested: { type: 'object', dynamic: true },
        },
      },
    });
  });
});

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
