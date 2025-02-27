/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { nanosToMicros } from './nanos_to_micros';

describe('nanosToMicros', () => {
  test('should correctly format nanosecond string', () => {
    expect(nanosToMicros('159053000000')).toEqual(159053000);
    expect(nanosToMicros('102026000000')).toEqual(102026000);
  });

  test('should correctly handle unexpected inputs', () => {
    // @ts-expect-error
    expect(nanosToMicros(159053000000)).toEqual(159053000);
    // @ts-expect-error
    expect(nanosToMicros(['159053000000'])).toEqual(0);
    // @ts-expect-error
    expect(nanosToMicros({ foo: '159053000000' })).toEqual(0);
    expect(nanosToMicros('abc')).toEqual(0);
  });
});
