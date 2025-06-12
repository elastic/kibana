/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldType } from '../../types/types';
import { ensureBooleanType, ensureCorrectTyping, ensureStringType } from './configuration_utils';

describe('configuration utils', () => {
  describe('ensureBooleanType', () => {
    it('converts truthy values to true', () => {
      expect(ensureBooleanType('true')).toBe(true);
      expect(ensureBooleanType(1)).toBe(true);
      expect(ensureBooleanType(true)).toBe(true);
      expect(ensureBooleanType('any string')).toBe(true);
    });

    it('converts falsy values to false', () => {
      expect(ensureBooleanType('')).toBe(false);
      expect(ensureBooleanType(0)).toBe(false);
      expect(ensureBooleanType(false)).toBe(false);
      expect(ensureBooleanType(null)).toBe(false);
    });
  });

  describe('ensureStringType', () => {
    it('converts values to string', () => {
      expect(ensureStringType('test')).toBe('test');
      expect(ensureStringType(123)).toBe('123');
      expect(ensureStringType(true)).toBe('true');
      expect(ensureStringType(false)).toBe('false');
    });

    it('converts null to empty string', () => {
      expect(ensureStringType(null)).toBe('');
    });
  });

  describe('ensureCorrectTyping', () => {
    it('handles integer type', () => {
      expect(ensureCorrectTyping(FieldType.INTEGER, '123')).toBe(123);
      expect(ensureCorrectTyping(FieldType.INTEGER, 456)).toBe(456);
      expect(ensureCorrectTyping(FieldType.INTEGER, 'invalid')).toBe('invalid');
      expect(ensureCorrectTyping(FieldType.INTEGER, null)).toBe(null);
    });

    it('handles boolean type', () => {
      expect(ensureCorrectTyping(FieldType.BOOLEAN, true)).toBe(true);
      expect(ensureCorrectTyping(FieldType.BOOLEAN, 1)).toBe(true);
      expect(ensureCorrectTyping(FieldType.BOOLEAN, false)).toBe(false);
      expect(ensureCorrectTyping(FieldType.BOOLEAN, null)).toBe(false);
    });

    it('handles string type', () => {
      expect(ensureCorrectTyping(FieldType.STRING, 'test')).toBe('test');
      expect(ensureCorrectTyping(FieldType.STRING, 123)).toBe('123');
      expect(ensureCorrectTyping(FieldType.STRING, null)).toBe('');
    });
  });
});
