/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dictionary } from './common';
import { dictionaryToArray } from './common';

describe('Types: Dictionary', () => {
  test('dictionaryToArray()', () => {
    const dict: Dictionary<number> = {
      one: 1,
      two: 2,
    };

    expect(dictionaryToArray(dict)).toEqual([1, 2]);
  });
});
