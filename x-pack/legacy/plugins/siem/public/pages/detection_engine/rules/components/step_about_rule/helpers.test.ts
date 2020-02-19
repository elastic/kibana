/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isUrlInvalid, isIPv4, isIPv6 } from './helpers';

describe('helpers', () => {
  describe('isUrlInvalid', () => {
    test('verifies invalid url', () => {
      expect(isUrlInvalid('this is not a url')).toBeTruthy();
    });

    test('verifies valid url', () => {
      expect(isUrlInvalid('https://www.elastic.co/')).toBeFalsy();
    });
  });

  describe('isIPv4', () => {
    test('verifies invalid ipv4', () => {
      expect(isIPv4('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBeFalsy();
    });

    test('verifies valid ipv4', () => {
      expect(isIPv4('192.168.1.1')).toBeTruthy();
    });
  });

  describe('isIPv6', () => {
    test('verifies invalid ipv6', () => {
      expect(isIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBeTruthy();
    });

    test('verifies valid ipv6', () => {
      expect(isIPv6('192.168.1.1')).toBeFalsy();
    });
  });
});
