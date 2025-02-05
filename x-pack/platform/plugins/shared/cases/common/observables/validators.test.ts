/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDomain, validateEmail, validateGenericValue, validateIp } from './validators';

describe('validateEmail', () => {
  it('should return an error if the value is not a string', () => {
    const result = validateEmail({
      value: undefined,
    });

    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
    });
  });

  it('should return an error if the value is not a valid email', () => {
    const result = validateEmail({
      value: 'invalid-email',
    });

    expect(result).toEqual({
      code: 'ERR_NOT_EMAIL',
    });
  });

  it('should return undefined if the value is a valid email', () => {
    const result = validateEmail({
      value: 'test@example.com',
    });

    expect(result).toBeUndefined();
  });
});

describe('genericValidator', () => {
  it('should return an error if the value is not a string', () => {
    const result = validateGenericValue({
      value: 123,
    });

    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
    });
  });

  it('should return an error if the value is not valid', () => {
    const result = validateGenericValue({
      value: 'invalid value!',
    });

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return undefined if the value is valid', () => {
    const result = validateGenericValue({
      value: 'valid_value',
    });

    expect(result).toBeUndefined();
  });
});

describe('validateDomain', () => {
  it('should return undefined for a valid domain', () => {
    const result = validateDomain({
      value: 'example.com',
    });

    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid domain', () => {
    const result = validateDomain({
      value: '-invalid.com',
    });

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for hyphen-spaced strings', () => {
    const result = validateDomain({
      value: 'test-test',
    });

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a non-string value', () => {
    const result = validateDomain({
      value: 12345,
    });

    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
    });
  });
});

describe('validateIp', () => {
  it('should return undefined for a valid ipv4', () => {
    const result = validateIp('ipv4')({
      value: '127.0.0.1',
    });

    expect(result).toBeUndefined();
  });

  it('should return an error for invalid ipv4', () => {
    const result = validateIp('ipv4')({
      value: 'invalid ip',
    });

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });
});
