/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertStringToBase64 } from './saved_object';

describe('saved_object', () => {
  describe('convertStringToBase64', () => {
    test('it should base 64 encode a string such as the word "Frank"', () => {
      expect(convertStringToBase64('Frank')).toBe('RnJhbms=');
    });

    test('it should base 64 encode a large string such as the "Some very long string for you"', () => {
      expect(convertStringToBase64('Some very long string for you')).toBe(
        'U29tZSB2ZXJ5IGxvbmcgc3RyaW5nIGZvciB5b3U='
      );
    });

    test('it should base 64 encode a empty string as an empty string', () => {
      expect(convertStringToBase64('')).toBe('');
    });
  });
});
