/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateToken } from './generate_token';

describe('generateToken', () => {
  const secret = 'test-space-secret-abc123';
  const entityClass = 'HOST_NAME';
  const field = 'host.name';
  const value = 'my-server-01';

  it('returns a token with the entity class prefix', () => {
    const token = generateToken(secret, entityClass, field, value);

    expect(token).toMatch(/^HOST_NAME_[a-f0-9]+$/);
  });

  it('returns the same token for the same inputs (deterministic)', () => {
    const token1 = generateToken(secret, entityClass, field, value);
    const token2 = generateToken(secret, entityClass, field, value);

    expect(token1).toBe(token2);
  });

  it('returns different tokens for different values', () => {
    const token1 = generateToken(secret, entityClass, field, 'server-a');
    const token2 = generateToken(secret, entityClass, field, 'server-b');

    expect(token1).not.toBe(token2);
  });

  it('returns different tokens for different entity classes', () => {
    const token1 = generateToken(secret, 'HOST_NAME', field, value);
    const token2 = generateToken(secret, 'USER_NAME', field, value);

    expect(token1).not.toBe(token2);
  });

  it('returns different tokens for different fields', () => {
    const token1 = generateToken(secret, entityClass, 'host.name', value);
    const token2 = generateToken(secret, entityClass, 'source.host', value);

    expect(token1).not.toBe(token2);
  });

  it('returns different tokens for different secrets (cross-space isolation)', () => {
    const token1 = generateToken('space-1-secret', entityClass, field, value);
    const token2 = generateToken('space-2-secret', entityClass, field, value);

    expect(token1).not.toBe(token2);
  });

  it('returns a token with the specified hash length', () => {
    const hashLength = 16;
    const token = generateToken(secret, entityClass, field, value, hashLength);
    const hashPart = token.replace(`${entityClass}_`, '');

    expect(hashPart).toHaveLength(hashLength);
  });

  it('returns the default hash length of 32 hex characters', () => {
    const token = generateToken(secret, entityClass, field, value);
    const hashPart = token.replace(`${entityClass}_`, '');

    expect(hashPart).toHaveLength(32);
  });

  it('preserves whitespace in values before hashing', () => {
    const token1 = generateToken(secret, entityClass, field, '  my-server-01  ');
    const token2 = generateToken(secret, entityClass, field, 'my-server-01');

    expect(token1).not.toBe(token2);
  });

  it('throws when secret is empty', () => {
    expect(() => generateToken('', entityClass, field, value)).toThrow(
      'Secret must be non-empty for token generation'
    );
  });

  it('clamps hash length to valid range', () => {
    const tokenMin = generateToken(secret, entityClass, field, value, 0);
    const hashPartMin = tokenMin.replace(`${entityClass}_`, '');
    expect(hashPartMin).toHaveLength(32);

    const tokenMax = generateToken(secret, entityClass, field, value, 100);
    const hashPartMax = tokenMax.replace(`${entityClass}_`, '');
    expect(hashPartMax).toHaveLength(64);
  });

  it('returns default hash length when hashLength is NaN', () => {
    const token = generateToken(secret, entityClass, field, value, NaN);
    const hashPart = token.replace(`${entityClass}_`, '');
    expect(hashPart).toHaveLength(32);
  });

  it('returns different tokens when components contain the delimiter character', () => {
    const token1 = generateToken(secret, 'A', 'B:C', 'D');
    const token2 = generateToken(secret, 'A:B', 'C', 'D');

    expect(token1).not.toBe(token2);
  });
});
