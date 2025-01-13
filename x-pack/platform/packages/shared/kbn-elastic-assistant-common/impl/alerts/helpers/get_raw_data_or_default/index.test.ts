/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRawDataOrDefault } from '.';

describe('getRawDataOrDefault', () => {
  it('returns the raw data when it is valid', () => {
    const rawData = {
      field1: [1, 2, 3],
      field2: ['a', 'b', 'c'],
    };

    expect(getRawDataOrDefault(rawData)).toEqual(rawData);
  });

  it('returns an empty object when the raw data is invalid', () => {
    const rawData = {
      field1: [1, 2, 3],
      field2: 'invalid',
    };

    expect(getRawDataOrDefault(rawData)).toEqual({});
  });
});
