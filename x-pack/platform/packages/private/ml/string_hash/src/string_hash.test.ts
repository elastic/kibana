/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringHash } from './string_hash';

describe('stringHash', () => {
  test('should return a unique number based off a string', () => {
    const hash1 = stringHash('the-string-1');
    const hash2 = stringHash('the-string-2');
    expect(hash1).not.toBe(hash2);
  });

  test('should return the same number for identical strings', () => {
    const hash1 = stringHash('the-string-1');
    const hash2 = stringHash('the-string-1');
    expect(hash1).toBe(hash2);
  });
});
