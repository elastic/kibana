/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringMatch } from './string_match';

describe('stringMatch', () => {
  test('should return true for partial match', () => {
    expect(stringMatch('foobar', 'Foo')).toBe(true);
  });
  test('should return true for exact match', () => {
    expect(stringMatch('foobar', 'foobar')).toBe(true);
  });
  test('should return false for no match', () => {
    expect(stringMatch('foobar', 'nomatch')).toBe(false);
  });
  test('should catch error for invalid regex substring and return false', () => {
    expect(stringMatch('foobar', '?')).toBe(false);
  });
});
