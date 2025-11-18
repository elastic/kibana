/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSeed } from './validate_seed';

describe('validateSeeds', () => {
  test(`rejects invalid seeds and invalid ports`, () => {
    const errorsCount = validateSeed('&').length;
    expect(errorsCount).toBe(2);
  });

  test(`accepts no seed`, () => {
    const errorsCount = validateSeed('').length;
    expect(errorsCount).toBe(0);
  });

  test(`accepts a valid seed with a valid port`, () => {
    const errorsCount = validateSeed('seed:10').length;
    expect(errorsCount).toBe(0);
  });

  describe('IPv4 addresses', () => {
    test('accepts valid IPv4 address with port', () => {
      const errorsCount = validateSeed('192.168.1.1:9300').length;
      expect(errorsCount).toBe(0);
    });

    test('rejects valid IPv4 address without port', () => {
      const errorsCount = validateSeed('192.168.1.1').length;
      expect(errorsCount).toBeGreaterThan(0);
    });

    test('rejects invalid IPv4 address', () => {
      const errorsCount = validateSeed('999.999.999.999').length;
      expect(errorsCount).toBeGreaterThan(0);
    });
  });

  describe('IPv6 addresses', () => {
    test('accepts valid IPv6 address with brackets and port', () => {
      const errorsCount = validateSeed('[2001:db8::1]:9300').length;
      expect(errorsCount).toBe(0);
    });

    test('rejects IPv6 address without brackets and port', () => {
      // Without brackets, port is not recognized as such
      // and it's either invalid or part of the ipv6 host
      const errorsCount = validateSeed('2001:db8::1:9300').length;
      expect(errorsCount).toBeGreaterThan(0);
    });

    test('rejects invalid IPv6 address', () => {
      const errorsCount = validateSeed('[gggg::1]').length;
      expect(errorsCount).toBeGreaterThan(0);
    });
  });
});
