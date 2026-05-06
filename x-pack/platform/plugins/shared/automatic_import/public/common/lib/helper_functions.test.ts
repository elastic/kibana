/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateId,
  normalizeTitleName,
  isValidNameFormat,
  isNotPurelyNumeric,
  startsWithLetter,
  meetsMinLength,
  meetsMaxLength,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
} from './helper_functions';

describe('helper_functions', () => {
  describe('generateId', () => {
    it('should return a 12-character string', () => {
      const id = generateId();
      expect(id).toHaveLength(12);
    });

    it('should return only alphanumeric characters', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique IDs on multiple calls', () => {
      const ids = new Set<string>();
      const numIterations = 100;

      for (let i = 0; i < numIterations; i++) {
        ids.add(generateId());
      }

      // All generated IDs should be unique
      expect(ids.size).toBe(numIterations);
    });

    it('should not contain hyphens', () => {
      const id = generateId();
      expect(id).not.toContain('-');
    });
  });

  describe('normalizeTitleName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeTitleName('MyIntegration')).toBe('myintegration');
    });

    it('should replace spaces with underscores', () => {
      expect(normalizeTitleName('My Integration')).toBe('my_integration');
    });

    it('should collapse multiple spaces into single underscore', () => {
      expect(normalizeTitleName('My   Integration')).toBe('my_integration');
    });

    it('should collapse multiple underscores into single underscore', () => {
      expect(normalizeTitleName('My___Integration')).toBe('my_integration');
    });

    it('should collapse mixed spaces and underscores into single underscore', () => {
      expect(normalizeTitleName('My _ Integration')).toBe('my_integration');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(normalizeTitleName('  My Integration  ')).toBe('my_integration');
    });

    it('should remove leading underscores', () => {
      expect(normalizeTitleName('_my_integration')).toBe('my_integration');
      expect(normalizeTitleName('__my_integration')).toBe('my_integration');
    });

    it('should remove trailing underscores', () => {
      expect(normalizeTitleName('my_integration_')).toBe('my_integration');
      expect(normalizeTitleName('my_integration__')).toBe('my_integration');
    });

    it('should handle trailing spaces that become underscores', () => {
      expect(normalizeTitleName('my integration ')).toBe('my_integration');
      expect(normalizeTitleName(' my integration ')).toBe('my_integration');
    });
  });

  describe('isValidNameFormat', () => {
    it('should return true for empty string', () => {
      expect(isValidNameFormat('')).toBe(true);
    });

    it('should return true for alphanumeric characters', () => {
      expect(isValidNameFormat('MyIntegration123')).toBe(true);
    });

    it('should return true for names with spaces', () => {
      expect(isValidNameFormat('My Integration')).toBe(true);
    });

    it('should return true for names with underscores', () => {
      expect(isValidNameFormat('My_Integration')).toBe(true);
    });

    it('should return false for names with special characters', () => {
      expect(isValidNameFormat('My-Integration')).toBe(false);
      expect(isValidNameFormat('My@Integration')).toBe(false);
      expect(isValidNameFormat('My!Integration')).toBe(false);
      expect(isValidNameFormat('My.Integration')).toBe(false);
    });

    it('should return false for names with unicode characters', () => {
      expect(isValidNameFormat('Integración')).toBe(false);
      expect(isValidNameFormat('インテグレーション')).toBe(false);
    });
  });

  describe('isNotPurelyNumeric', () => {
    it('should return true for empty string', () => {
      expect(isNotPurelyNumeric('')).toBe(true);
    });

    it('should return true for names with letters', () => {
      expect(isNotPurelyNumeric('Integration123')).toBe(true);
      expect(isNotPurelyNumeric('a')).toBe(true);
    });

    it('should return true for names starting with numbers but containing letters', () => {
      expect(isNotPurelyNumeric('123Integration')).toBe(true);
    });

    it('should return false for purely numeric names', () => {
      expect(isNotPurelyNumeric('123')).toBe(false);
      expect(isNotPurelyNumeric('1')).toBe(false);
    });

    it('should return false for numeric names with spaces or underscores only', () => {
      expect(isNotPurelyNumeric('123 456')).toBe(false);
      expect(isNotPurelyNumeric('123_456')).toBe(false);
    });

    it('should return true for names with letters and underscores/spaces', () => {
      expect(isNotPurelyNumeric('my_123')).toBe(true);
      expect(isNotPurelyNumeric('123 abc')).toBe(true);
    });
  });

  describe('startsWithLetter', () => {
    it('should return true for empty string', () => {
      expect(startsWithLetter('')).toBe(true);
    });

    it('should return true for names starting with a letter', () => {
      expect(startsWithLetter('MyIntegration')).toBe(true);
      expect(startsWithLetter('a')).toBe(true);
      expect(startsWithLetter('A123')).toBe(true);
    });

    it('should return false for names starting with a number', () => {
      expect(startsWithLetter('123Integration')).toBe(false);
      expect(startsWithLetter('1abc')).toBe(false);
    });

    it('should return false for names starting with underscore', () => {
      expect(startsWithLetter('_integration')).toBe(false);
    });

    it('should return true for names with leading spaces (trimmed before check)', () => {
      // Leading spaces are trimmed, so ' integration' becomes 'integration' which starts with a letter
      expect(startsWithLetter(' integration')).toBe(true);
    });
  });

  describe('meetsMinLength', () => {
    it('should return true for empty string', () => {
      expect(meetsMinLength('')).toBe(true);
    });

    it('should return true for names with 2 or more characters', () => {
      expect(meetsMinLength('ab')).toBe(true);
      expect(meetsMinLength('abc')).toBe(true);
      expect(meetsMinLength('my integration')).toBe(true);
    });

    it('should return false for single character names', () => {
      expect(meetsMinLength('a')).toBe(false);
    });
  });

  describe('meetsMaxLength', () => {
    it('should return true for empty string', () => {
      expect(meetsMaxLength('')).toBe(true);
    });

    it('should return true for names within limit', () => {
      expect(meetsMaxLength('ab')).toBe(true);
      expect(meetsMaxLength('a'.repeat(256))).toBe(true);
    });

    it('should return false for names exceeding 256 characters', () => {
      expect(meetsMaxLength('a'.repeat(257))).toBe(false);
    });
  });

  describe('constants', () => {
    it('should have correct MIN_NAME_LENGTH', () => {
      expect(MIN_NAME_LENGTH).toBe(2);
    });

    it('should have correct MAX_NAME_LENGTH', () => {
      expect(MAX_NAME_LENGTH).toBe(256);
    });
  });
});
