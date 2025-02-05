/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDomain, validateEmail, validateGenericValue, validateIp } from './validators';

describe('validateEmail', () => {
  it('should return an error if the value is not a string', () => {
    const result = validateEmail(undefined);

    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
    });
  });

  it('should return an error if the value is not a valid email', () => {
    const result = validateEmail('invalid-email');

    expect(result).toEqual({
      code: 'ERR_NOT_EMAIL',
    });
  });

  it('should return undefined if the value is a valid email', () => {
    const result = validateEmail('test@example.com');

    expect(result).toBeUndefined();
  });
});

describe('genericValidator', () => {
  it('should return an error if the value is not a string', () => {
    const result = validateGenericValue(123);

    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
    });
  });

  it('should return an error if the value is not valid', () => {
    const result = validateGenericValue('invalid value!');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error if the value is a json', () => {
    const result = validateGenericValue('{}');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return undefined if the value is valid', () => {
    const result = validateGenericValue('valid_value');

    expect(result).toBeUndefined();
  });
});

describe('validateDomain', () => {
  it('should return undefined for a valid domain', () => {
    const result = validateDomain('example.com');

    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid domain', () => {
    const result = validateDomain('-invalid.com');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for hyphen-spaced strings', () => {
    const result = validateDomain('test-test');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a non-string value', () => {
    const result = validateDomain(12345);

    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
    });
  });
});

describe('validateIp', () => {
  it('should return undefined for a valid ipv4', () => {
    const result = validateIp('ipv4')('127.0.0.1');

    expect(result).toBeUndefined();
  });

  it('should return an error for invalid ipv4', () => {
    const result = validateIp('ipv4')('invalid ip');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return undefined for a valid ipv6', () => {
    const result = validateIp('ipv6')('::1');
    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid ipv6', () => {
    const result = validateIp('ipv6')('invalid ipv6');
    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });
});
