/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateProxy } from './validate_proxy';

describe('validateProxy', () => {
  test(`rejects proxy address when there's no input`, () => {
    expect(validateProxy(undefined)).toMatchSnapshot();
  });

  test(`rejects proxy address when the address is invalid`, () => {
    expect(validateProxy('___')).toMatchSnapshot();
  });

  test(`rejects proxy address when the port is invalid`, () => {
    expect(validateProxy('noport')).toMatchSnapshot();
  });

  test(`accepts valid proxy address`, () => {
    expect(validateProxy('localhost:3000')).toBe(null);
  });

  describe('IPv4 addresses', () => {
    test('accepts valid IPv4 address with port', () => {
      expect(validateProxy('192.168.1.1:9300')).toBeNull();
    });

    test('rejects valid IPv4 address without port', () => {
      expect(validateProxy('192.168.1.1')).toMatchSnapshot();
    });

    test('rejects invalid IPv4 address', () => {
      expect(validateProxy('999.999.999.999')).toMatchSnapshot();
    });
  });

  describe('IPv6 addresses', () => {
    test('accepts valid IPv6 address with brackets and port', () => {
      expect(validateProxy('[2001:db8::1]:9300')).toBeNull();
    });

    test('rejects IPv6 address without brackets and port', () => {
      // Without brackets, port is not recognized as such
      // and it's either invalid or part of the ipv6 host
      expect(validateProxy('2001:db8::1:9300')).toMatchSnapshot();
    });

    test('rejects invalid IPv6 address', () => {
      expect(validateProxy('[gggg::1]')).toMatchSnapshot();
    });
  });
});
