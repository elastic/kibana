/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeUndefinedValues, deepEqualIgnoreUndefined } from './utils';

describe('deepEqualIgnoreUndefined', () => {
  const testObjectA = Object.freeze({
    a: 1,
    b: {
      c: 2,
      d: undefined,
    },
  });

  const testObjectB = Object.freeze({
    a: 1,
    b: {
      c: 2,
      d: undefined,
    },
  });

  it('knows how to remove undefined values', () => {
    expect(removeUndefinedValues(testObjectA)).toStrictEqual({
      a: 1,
      b: {
        c: 2,
      },
    });
  });

  it('knows how to compare two objects and see if they are equal ignoring undefined values', () => {
    expect(deepEqualIgnoreUndefined(testObjectA, testObjectB)).toBe(true);
  });
});
