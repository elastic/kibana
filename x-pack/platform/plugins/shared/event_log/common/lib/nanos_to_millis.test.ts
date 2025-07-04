/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nanosToMillis } from './nanos_to_millis';

describe('nanosToMillis', () => {
  test('should return 0 when passing in "0" nanos', () => {
    expect(nanosToMillis('0')).toEqual(0);
  });

  test('should drop decimals when passing in "1" nanos', () => {
    expect(nanosToMillis('1')).toEqual(0);
  });

  test('should drop decimals when passing in "1000001" nanos', () => {
    expect(nanosToMillis('1000001')).toEqual(1);
  });

  test('should return 9007199254740991 (Number.MAX_SAFE_INTEGER) when passing in "9007199254740991000000" nanos', () => {
    expect(nanosToMillis('9007199254740991000000')).toEqual(9007199254740991);
  });

  test('should work when numbers are passed in', () => {
    expect(nanosToMillis(0)).toEqual(0);
    expect(nanosToMillis(1)).toEqual(0);
    expect(nanosToMillis(1000001)).toEqual(1);
  });
});
