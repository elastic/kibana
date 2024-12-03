/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenObject } from './unflatten_object';

describe('unflattenObject', () => {
  it('unflattens deeply nested objects', () => {
    expect(unflattenObject({ 'first.second.third': 'third' })).toEqual({
      first: {
        second: {
          third: 'third',
        },
      },
    });
  });

  it('does not unflatten arrays', () => {
    expect(
      unflattenObject({
        simpleArray: ['0', '1', '2'],
        complexArray: [{ one: 'one', two: 'two', three: 'three' }],
        'nested.array': [0, 1, 2],
        'complex.nested': [{ one: 'one', two: 'two', 'first.second': 'foo', 'first.third': 'bar' }],
      })
    ).toEqual({
      simpleArray: ['0', '1', '2'],
      complexArray: [{ one: 'one', two: 'two', three: 'three' }],
      nested: {
        array: [0, 1, 2],
      },
      complex: {
        nested: [{ one: 'one', two: 'two', first: { second: 'foo', third: 'bar' } }],
      },
    });
  });

  it('handles null values correctly', () => {
    expect(
      unflattenObject({
        'agent.name': null,
      })
    ).toEqual({
      agent: {
        name: null,
      },
    });
  });
});
