/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { existingFields } from './existing_fields';

describe('existingFields', () => {
  function field(name: string, parent?: string) {
    return {
      name,
      subType: parent ? { multi: { parent } } : undefined,
      aggregatable: true,
      esTypes: [],
      readFromDocValues: true,
      searchable: true,
      type: 'string',
    };
  }

  it('should handle root level fields', () => {
    const result = existingFields(
      [{ _source: { foo: 'bar' } }, { _source: { baz: 0 } }],
      [field('foo'), field('bar'), field('baz')]
    );

    expect(result).toEqual(['foo', 'baz']);
  });

  it('should handle arrays of objects', () => {
    const result = existingFields(
      [{ _source: { stuff: [{ foo: 'bar' }, { baz: 0 }] } }],
      [field('stuff.foo'), field('stuff.bar'), field('stuff.baz')]
    );

    expect(result).toEqual(['stuff.foo', 'stuff.baz']);
  });

  it('should handle basic arrays', () => {
    const result = existingFields([{ _source: { stuff: ['heyo', 'there'] } }], [field('stuff')]);

    expect(result).toEqual(['stuff']);
  });

  it('should handle deep object structures', () => {
    const result = existingFields(
      [{ _source: { geo: { coordinates: { lat: 40, lon: -77 } } } }],
      [field('geo.coordinates')]
    );

    expect(result).toEqual(['geo.coordinates']);
  });

  it('should be false if it hits a positive leaf before the end of the path', () => {
    const result = existingFields(
      [{ _source: { geo: { coordinates: 32 } } }],
      [field('geo.coordinates.lat')]
    );

    expect(result).toEqual([]);
  });

  it('should prefer parent to name', () => {
    const result = existingFields(
      [{ _source: { stuff: [{ foo: 'bar' }, { baz: 0 }] } }],
      [field('goober', 'stuff.foo'), field('soup', 'stuff.bar'), field('pea', 'stuff.baz')]
    );

    expect(result).toEqual(['goober', 'pea']);
  });
});
