/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFieldType,
  castExtendedFieldValue,
  buildExtendedFieldsForAnalytics,
} from './extended_fields';

describe('extended_fields utilities', () => {
  describe('getFieldType', () => {
    it('extracts type suffix from key', () => {
      expect(getFieldType('severity_score_as_long')).toBe('long');
      expect(getFieldType('src_ip_as_ip')).toBe('ip');
      expect(getFieldType('department_as_keyword')).toBe('keyword');
      expect(getFieldType('due_date_as_date')).toBe('date');
      expect(getFieldType('is_active_as_boolean')).toBe('boolean');
      expect(getFieldType('amount_as_double')).toBe('double');
      expect(getFieldType('notes_as_text')).toBe('text');
      expect(getFieldType('window_as_date_range')).toBe('date_range');
    });

    it('returns null for keys without a valid type suffix', () => {
      expect(getFieldType('no_suffix')).toBeNull();
      expect(getFieldType('bad_as_unknown')).toBeNull();
      expect(getFieldType('')).toBeNull();
    });
  });

  describe('castExtendedFieldValue', () => {
    it('casts long values', () => {
      expect(castExtendedFieldValue('score_as_long', '85')).toBe(85);
      expect(castExtendedFieldValue('score_as_long', '-10')).toBe(-10);
      expect(castExtendedFieldValue('score_as_long', '0')).toBe(0);
    });

    it('throws on invalid long values', () => {
      expect(() => castExtendedFieldValue('score_as_long', 'abc')).toThrow(
        'Cannot cast "abc" to long'
      );
    });

    it('casts double values', () => {
      expect(castExtendedFieldValue('amount_as_double', '3.14')).toBeCloseTo(3.14);
      expect(castExtendedFieldValue('amount_as_double', '-0.5')).toBeCloseTo(-0.5);
    });

    it('throws on invalid double values', () => {
      expect(() => castExtendedFieldValue('amount_as_double', 'abc')).toThrow(
        'Cannot cast "abc" to double'
      );
    });

    it('casts boolean values', () => {
      expect(castExtendedFieldValue('active_as_boolean', 'true')).toBe(true);
      expect(castExtendedFieldValue('active_as_boolean', 'True')).toBe(true);
      expect(castExtendedFieldValue('active_as_boolean', 'false')).toBe(false);
      expect(castExtendedFieldValue('active_as_boolean', 'anything')).toBe(false);
    });

    it('passes through keyword, text, ip, and date as strings', () => {
      expect(castExtendedFieldValue('dept_as_keyword', 'Engineering')).toBe('Engineering');
      expect(castExtendedFieldValue('notes_as_text', 'some notes')).toBe('some notes');
      expect(castExtendedFieldValue('src_as_ip', '192.168.1.42')).toBe('192.168.1.42');
      expect(castExtendedFieldValue('due_as_date', '2025-01-15T00:00:00Z')).toBe(
        '2025-01-15T00:00:00Z'
      );
    });

    it('parses date_range as JSON', () => {
      const rangeStr = JSON.stringify({ gte: '2025-01-01', lte: '2025-12-31' });
      expect(castExtendedFieldValue('window_as_date_range', rangeStr)).toEqual({
        gte: '2025-01-01',
        lte: '2025-12-31',
      });
    });

    it('passes through unknown suffixes as strings', () => {
      expect(castExtendedFieldValue('mystery_field', 'hello')).toBe('hello');
    });
  });

  describe('buildExtendedFieldsForAnalytics', () => {
    it('returns undefined for undefined input', () => {
      expect(buildExtendedFieldsForAnalytics(undefined)).toBeUndefined();
    });

    it('returns undefined when all values are null', () => {
      expect(
        buildExtendedFieldsForAnalytics({
          score_as_long: null,
          dept_as_keyword: null,
        })
      ).toBeUndefined();
    });

    it('casts all fields correctly', () => {
      const result = buildExtendedFieldsForAnalytics({
        severity_score_as_long: '85',
        src_ip_as_ip: '192.168.1.42',
        department_as_keyword: 'Engineering',
        is_active_as_boolean: 'true',
        amount_as_double: '3.14',
        empty_field_as_keyword: null,
      });

      expect(result).toEqual({
        severity_score_as_long: 85,
        src_ip_as_ip: '192.168.1.42',
        department_as_keyword: 'Engineering',
        is_active_as_boolean: true,
        amount_as_double: 3.14,
      });
    });

    it('skips fields that fail to cast and logs a warning', () => {
      const warnings: string[] = [];
      const logger = { warn: (msg: string) => warnings.push(msg) };

      const result = buildExtendedFieldsForAnalytics(
        {
          good_field_as_keyword: 'hello',
          bad_field_as_long: 'not_a_number',
        },
        logger
      );

      expect(result).toEqual({ good_field_as_keyword: 'hello' });
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('bad_field_as_long');
    });
  });
});
