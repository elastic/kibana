/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { existingFields, Field, buildFieldList } from './existing_fields';

describe('existingFields', () => {
  function field(opts: string | Partial<Field>): Field {
    const obj = typeof opts === 'object' ? opts : {};
    const name = (typeof opts === 'string' ? opts : opts.name) || 'test';

    return {
      name,
      isScript: false,
      isAlias: false,
      path: name.split('.'),
      ...obj,
    };
  }

  function indexPattern(_source: unknown, fields: unknown = {}) {
    return { _source, fields };
  }

  it('should handle root level fields', () => {
    const result = existingFields(
      [indexPattern({ foo: 'bar' }), indexPattern({ baz: 0 })],
      [field('foo'), field('bar'), field('baz')]
    );

    expect(result).toEqual(['foo', 'baz']);
  });

  it('should handle arrays of objects', () => {
    const result = existingFields(
      [indexPattern({ stuff: [{ foo: 'bar' }, { baz: 0 }] })],
      [field('stuff.foo'), field('stuff.bar'), field('stuff.baz')]
    );

    expect(result).toEqual(['stuff.foo', 'stuff.baz']);
  });

  it('should handle basic arrays', () => {
    const result = existingFields([indexPattern({ stuff: ['heyo', 'there'] })], [field('stuff')]);

    expect(result).toEqual(['stuff']);
  });

  it('should handle deep object structures', () => {
    const result = existingFields(
      [indexPattern({ geo: { coordinates: { lat: 40, lon: -77 } } })],
      [field('geo.coordinates')]
    );

    expect(result).toEqual(['geo.coordinates']);
  });

  it('should be false if it hits a positive leaf before the end of the path', () => {
    const result = existingFields(
      [indexPattern({ geo: { coordinates: 32 } })],
      [field('geo.coordinates.lat')]
    );

    expect(result).toEqual([]);
  });

  it('should use path, not name', () => {
    const result = existingFields(
      [indexPattern({ stuff: [{ foo: 'bar' }, { baz: 0 }] })],
      [field({ name: 'goober', path: ['stuff', 'foo'] })]
    );

    expect(result).toEqual(['goober']);
  });

  it('supports scripted fields', () => {
    const result = existingFields(
      [indexPattern({}, { bar: 'scriptvalue' })],
      [field({ name: 'baz', isScript: true, path: ['bar'] })]
    );

    expect(result).toEqual(['baz']);
  });
});

describe('buildFieldList', () => {
  const indexPattern = {
    id: '',
    type: 'indexpattern',
    attributes: {
      title: 'testpattern',
      fields: JSON.stringify([
        { name: 'foo', scripted: true, lang: 'painless', script: '2+2' },
        { name: 'bar' },
        { name: '@bar' },
        { name: 'baz' },
      ]),
    },
    references: [],
  };

  const mappings = {
    testpattern: {
      mappings: {
        properties: {
          '@bar': {
            type: 'alias',
            path: 'bar',
          },
        },
      },
    },
  };

  const fieldDescriptors = [
    {
      name: 'baz',
      subType: { multi: { parent: 'a.b.c' } },
    },
  ];

  it('uses field descriptors to determine the path', () => {
    const fields = buildFieldList(indexPattern, mappings, fieldDescriptors);
    expect(fields.find(f => f.name === 'baz')).toMatchObject({
      isAlias: false,
      isScript: false,
      name: 'baz',
      path: ['a', 'b', 'c'],
    });
  });

  it('uses aliases to determine the path', () => {
    const fields = buildFieldList(indexPattern, mappings, fieldDescriptors);
    expect(fields.find(f => f.isAlias)).toMatchObject({
      isAlias: true,
      isScript: false,
      name: '@bar',
      path: ['bar'],
    });
  });

  it('supports scripted fields', () => {
    const fields = buildFieldList(indexPattern, mappings, fieldDescriptors);
    expect(fields.find(f => f.isScript)).toMatchObject({
      isAlias: false,
      isScript: true,
      name: 'foo',
      path: ['foo'],
      lang: 'painless',
      script: '2+2',
    });
  });
});
