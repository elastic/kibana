/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateDomain,
  validateEmail,
  validateGenericValue,
  validateIp,
  validateFilePath,
} from './validators';

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

  it('should return undefined if the value contains dashes', () => {
    const result = validateGenericValue('valid-value');

    expect(result).toBeUndefined();
  });
});

describe('validateDomain', () => {
  it('should return undefined for a valid domain (example.com)', () => {
    const result = validateDomain('example.com');

    expect(result).toBeUndefined();
  });

  it('should return undefined for a valid domain ending with "." (example.com.)', () => {
    const result = validateDomain('example.com.');

    expect(result).toBeUndefined();
  });

  it('should return undefined for a valid sub-domain (sub.example.com)', () => {
    const result = validateDomain('sub.example.com');

    expect(result).toBeUndefined();
  });

  it('should return undefined for a valid UK sub-domain (sub.example.co.uk)', () => {
    const result = validateDomain('sub.example.co.uk');

    expect(result).toBeUndefined();
  });

  it('should return an error for a domain with a label starting with "-"', () => {
    const result = validateDomain('-invalid.com');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a domain with a label ending with "-"', () => {
    const result = validateDomain('invalid-.com');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a domain with a label containing "--"', () => {
    const result = validateDomain('invalid--domain.com');

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

describe('validateFilePath', () => {
  it('should return undefined for a valid Unix file path', () => {
    const result = validateFilePath('/home/user/document.txt');

    expect(result).toBeUndefined();
  });

  it('should return undefined for a valid Windows file path', () => {
    const result = validateFilePath('C:\\Users\\user\\document.txt');

    expect(result).toBeUndefined();
  });

  it('should return undefined for a relative file path', () => {
    const result = validateFilePath('./relative/path/file.txt');

    expect(result).toBeUndefined();
  });

  it('should return undefined for a file path with spaces', () => {
    const result = validateFilePath('/path/to/my file.txt');

    expect(result).toBeUndefined();
  });

  it('should return an error for a non-string value', () => {
    const result = validateFilePath(12345);

    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
    });
  });

  it('should return an error for an empty string', () => {
    const result = validateFilePath('');

    expect(result).toEqual({
      code: 'ERR_EMPTY',
    });
  });

  it('should return an error for a path containing "<"', () => {
    const result = validateFilePath('/path/to/<invalid>.txt');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a path containing ">"', () => {
    const result = validateFilePath('/path/to/>invalid.txt');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a path containing "|"', () => {
    const result = validateFilePath('/path/to/invalid|file.txt');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a path containing "?"', () => {
    const result = validateFilePath('/path/to/invalid?.txt');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a path containing "*"', () => {
    const result = validateFilePath('/path/to/invalid*.txt');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });

  it('should return an error for a path containing double quotes', () => {
    const result = validateFilePath('/path/to/"invalid".txt');

    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
    });
  });
});
