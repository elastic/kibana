/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateInteger } from './v1';

describe('validateInteger', () => {
  it('validates integer correctly', () => {
    expect(validateInteger(5, 'foo')).toBeUndefined();
  });

  it('throws error for non integer', () => {
    expect(validateInteger(4.5, 'foo')).toEqual('schedule foo must be a positive integer.');
  });

  it('throws error for string', () => {
    // @ts-expect-error: testing invalid params
    expect(validateInteger('7', 'foo')).toEqual('schedule foo must be a positive integer.');
  });
});
