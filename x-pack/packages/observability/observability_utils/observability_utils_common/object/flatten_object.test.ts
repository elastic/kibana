/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flattenObject } from './flatten_object';

describe('flattenObject', () => {
  it('flattens deeply nested objects', () => {
    expect(
      flattenObject({
        first: {
          second: {
            third: 'third',
          },
        },
      })
    ).toEqual({
      'first.second.third': 'third',
    });
  });

  it('flattens arrays', () => {
    expect(
      flattenObject({
        child: {
          id: [1, 2],
        },
      })
    ).toEqual({
      'child.id': [1, 2],
    });
  });

  it('does not flatten arrays', () => {
    expect(
      flattenObject({
        simpleArray: ['0', '1', '2'],
        complexArray: [{ one: 'one', two: 'two', three: 'three' }],
        nested: {
          array: [0, 1, 2],
        },
      })
    ).toEqual({
      simpleArray: ['0', '1', '2'],
      complexArray: [{ one: 'one', two: 'two', three: 'three' }],
      'nested.array': [0, 1, 2],
    });
  });
});
