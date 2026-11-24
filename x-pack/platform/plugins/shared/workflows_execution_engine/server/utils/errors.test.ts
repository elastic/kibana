/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSerializedError } from './errors';

describe('isSerializedError', () => {
  it('returns true for objects with type and message', () => {
    expect(isSerializedError({ type: 'TestError', message: 'something' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isSerializedError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isSerializedError(undefined)).toBe(false);
  });

  it('returns false for strings', () => {
    expect(isSerializedError('error')).toBe(false);
  });

  it('returns false for objects missing type', () => {
    expect(isSerializedError({ message: 'no type' })).toBe(false);
  });

  it('returns false for objects missing message', () => {
    expect(isSerializedError({ type: 'no message' })).toBe(false);
  });
});
