/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isNonEmptyString,
  isStringArray,
  toStringArray,
  toStringOrStringArray,
} from './string_utils';

describe('string_utils', () => {
  describe('isStringArray', () => {
    it('returns true for string arrays', () => {
      expect(isStringArray(['a', 'b'])).toBe(true);
    });

    it('returns false for non-string arrays', () => {
      expect(isStringArray(['a', 1])).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for non-empty string', () => {
      expect(isNonEmptyString('logs-*')).toBe(true);
    });

    it('returns false for empty and non-string values', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe('toStringArray', () => {
    it('returns a single-item array for a non-empty string', () => {
      expect(toStringArray('logs-endpoint-*')).toEqual(['logs-endpoint-*']);
    });

    it('returns filtered values for string arrays', () => {
      expect(toStringArray(['logs-1', '', 'logs-2'])).toEqual(['logs-1', 'logs-2']);
    });

    it('returns an empty array for unsupported values', () => {
      expect(toStringArray(42)).toEqual([]);
      expect(toStringArray(undefined)).toEqual([]);
    });
  });

  describe('toStringOrStringArray', () => {
    it('returns undefined for no values', () => {
      expect(toStringOrStringArray(undefined)).toBeUndefined();
      expect(toStringOrStringArray([])).toBeUndefined();
    });

    it('returns a string for one value', () => {
      expect(toStringOrStringArray(['logs-1'])).toBe('logs-1');
    });

    it('returns a string array for multiple values', () => {
      expect(toStringOrStringArray(['logs-1', 'logs-2'])).toEqual(['logs-1', 'logs-2']);
    });
  });
});
