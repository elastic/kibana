/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { millisToNanos } from './millis_to_nanos';

describe('millisToNanos', () => {
  test('should return "0" when passing 0 millis', () => {
    expect(millisToNanos(0)).toEqual('0');
  });

  test('should return "1000000" when passing in 1 millis', () => {
    expect(millisToNanos(1)).toEqual('1000000');
  });

  test('should return "9007199254740991000000" when passing in 9007199254740991 (Number.MAX_SAFE_INTEGER)', () => {
    expect(millisToNanos(9007199254740991)).toEqual('9007199254740991000000');
  });

  test('should round to "1000000" wheen passing in 0.75 millis', () => {
    expect(millisToNanos(0.75)).toEqual('1000000');
  });
});
