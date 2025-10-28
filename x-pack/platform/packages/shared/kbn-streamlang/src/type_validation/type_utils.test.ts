/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPrimitiveType,
  isTypeofPlaceholder,
  normalizeToPrimitive,
  createTypeofPlaceholder,
  mergeTypeofPlaceholders,
  extractFieldsFromPlaceholder,
  inferTypeFromValue,
} from './type_utils';

describe('type_utils', () => {
  describe('isPrimitiveType', () => {
    it('returns true for primitive types', () => {
      expect(isPrimitiveType('string')).toBe(true);
      expect(isPrimitiveType('number')).toBe(true);
      expect(isPrimitiveType('boolean')).toBe(true);
      expect(isPrimitiveType('date')).toBe(true);
    });

    it('returns false for typeof placeholders', () => {
      expect(isPrimitiveType('typeof_field')).toBe(false);
      expect(isPrimitiveType('typeof_a,b')).toBe(false);
    });
  });

  describe('isTypeofPlaceholder', () => {
    it('returns true for typeof placeholders', () => {
      expect(isTypeofPlaceholder('typeof_field')).toBe(true);
      expect(isTypeofPlaceholder('typeof_a,b,c')).toBe(true);
    });

    it('returns false for primitive types', () => {
      expect(isTypeofPlaceholder('string')).toBe(false);
      expect(isTypeofPlaceholder('number')).toBe(false);
    });
  });

  describe('normalizeToPrimitive', () => {
    it('normalizes keyword to string', () => {
      expect(normalizeToPrimitive('keyword')).toBe('string');
      expect(normalizeToPrimitive('text')).toBe('string');
      expect(normalizeToPrimitive('string')).toBe('string');
    });

    it('normalizes int/long/float to number', () => {
      expect(normalizeToPrimitive('int')).toBe('number');
      expect(normalizeToPrimitive('long')).toBe('number');
      expect(normalizeToPrimitive('float')).toBe('number');
      expect(normalizeToPrimitive('double')).toBe('number');
      expect(normalizeToPrimitive('integer')).toBe('number');
      expect(normalizeToPrimitive('number')).toBe('number');
    });

    it('keeps date as date', () => {
      expect(normalizeToPrimitive('date')).toBe('date');
    });

    it('keeps boolean as boolean', () => {
      expect(normalizeToPrimitive('boolean')).toBe('boolean');
      expect(normalizeToPrimitive('bool')).toBe('boolean');
    });

    it('handles case insensitivity', () => {
      expect(normalizeToPrimitive('KEYWORD')).toBe('string');
      expect(normalizeToPrimitive('INT')).toBe('number');
      expect(normalizeToPrimitive('Boolean')).toBe('boolean');
    });

    it('defaults unknown types to string', () => {
      expect(normalizeToPrimitive('unknown')).toBe('string');
      expect(normalizeToPrimitive('custom')).toBe('string');
    });
  });

  describe('createTypeofPlaceholder', () => {
    it('creates a typeof placeholder from a field name', () => {
      expect(createTypeofPlaceholder('field1')).toBe('typeof_field1');
      expect(createTypeofPlaceholder('my.nested.field')).toBe('typeof_my.nested.field');
    });
  });

  describe('extractFieldsFromPlaceholder', () => {
    it('extracts a single field', () => {
      expect(extractFieldsFromPlaceholder('typeof_field1')).toEqual(['field1']);
    });

    it('extracts multiple fields', () => {
      expect(extractFieldsFromPlaceholder('typeof_a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('handles spaces in field names', () => {
      expect(extractFieldsFromPlaceholder('typeof_a, b, c')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('mergeTypeofPlaceholders', () => {
    it('merges two single-field placeholders', () => {
      const result = mergeTypeofPlaceholders('typeof_a', 'typeof_b');
      const fields = extractFieldsFromPlaceholder(result);
      expect(fields.sort()).toEqual(['a', 'b']);
    });

    it('merges a multi-field placeholder with a single-field placeholder', () => {
      const result = mergeTypeofPlaceholders('typeof_a,b', 'typeof_c');
      const fields = extractFieldsFromPlaceholder(result);
      expect(fields.sort()).toEqual(['a', 'b', 'c']);
    });

    it('deduplicates fields', () => {
      const result = mergeTypeofPlaceholders('typeof_a,b', 'typeof_b,c');
      const fields = extractFieldsFromPlaceholder(result);
      expect(fields.sort()).toEqual(['a', 'b', 'c']);
    });

    it('produces sorted field names for consistency', () => {
      const result = mergeTypeofPlaceholders('typeof_z', 'typeof_a');
      expect(result).toBe('typeof_a,z');
    });
  });

  describe('inferTypeFromValue', () => {
    it('infers string from string values', () => {
      expect(inferTypeFromValue('hello')).toBe('string');
      expect(inferTypeFromValue('')).toBe('string');
    });

    it('infers number from number values', () => {
      expect(inferTypeFromValue(123)).toBe('number');
      expect(inferTypeFromValue(0)).toBe('number');
      expect(inferTypeFromValue(3.14)).toBe('number');
    });

    it('infers boolean from boolean values', () => {
      expect(inferTypeFromValue(true)).toBe('boolean');
      expect(inferTypeFromValue(false)).toBe('boolean');
    });

    it('defaults to string for other types', () => {
      expect(inferTypeFromValue(null)).toBe('string');
      expect(inferTypeFromValue(undefined)).toBe('string');
      expect(inferTypeFromValue({})).toBe('string');
      expect(inferTypeFromValue([])).toBe('string');
    });
  });
});
