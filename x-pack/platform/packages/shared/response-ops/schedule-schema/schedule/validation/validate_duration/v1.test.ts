/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateDuration } from './v1';

describe('validateDuration', () => {
  it('validates duration in hours correctly', () => {
    expect(validateDuration('2h')).toBeUndefined();
  });

  it('validates duration in minutes correctly', () => {
    expect(validateDuration('45m')).toBeUndefined();
  });

  it('validates duration in seconds correctly', () => {
    expect(validateDuration('1000s')).toBeUndefined();
  });

  it('validates duration in milliseconds correctly', () => {
    expect(validateDuration('2249704ms')).toBeUndefined();
  });

  it('validates duration in days correctly', () => {
    expect(validateDuration('5d')).toBeUndefined();
  });

  it('throws error when duration is -1', () => {
    expect(validateDuration('-1')).toEqual('Invalid schedule duration format: -1');
  });

  it('throws error when invalid unit', () => {
    expect(validateDuration('1y')).toEqual('Invalid schedule duration format: 1y');
  });

  it('throws error when parsed as an invalid number', () => {
    expect(validateDuration('-1h')).toEqual('Invalid schedule duration.');
  });

  it('throws error when empty string', () => {
    expect(validateDuration('invalid')).toEqual('Invalid schedule duration format: invalid');
  });

  it('throws error when empty string with spaces', () => {
    expect(validateDuration(' ')).toEqual('Invalid schedule duration format:  ');
  });
});
