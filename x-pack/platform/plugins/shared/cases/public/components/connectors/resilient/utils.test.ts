/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhancedFieldMetaData } from './use_get_fields';
import { formFieldToResilientFieldValue } from './utils';

describe('utils', () => {
  describe('formFieldToResilientFieldValue', () => {
    it('should convert datepicker field to number', () => {
      const momentDate = {
        toDate: () => new Date('2024-01-01T00:00:00.000Z'),
      } as unknown;

      const result = formFieldToResilientFieldValue(momentDate, {
        input_type: 'datepicker',
      } as EnhancedFieldMetaData);

      expect(result).toBe(new Date('2024-01-01T00:00:00.000Z').getTime());
    });

    it('should convert select field to number', () => {
      const result = formFieldToResilientFieldValue('42', {
        input_type: 'select',
      } as EnhancedFieldMetaData);

      expect(result).toBe(42);
    });

    it('should convert empty select field to undefined', () => {
      const result = formFieldToResilientFieldValue('', {
        input_type: 'select',
      } as EnhancedFieldMetaData);

      expect(result).toBeNull();
    });

    it('should convert multiselect field to number array', () => {
      const result = formFieldToResilientFieldValue(['42', '43'], {
        input_type: 'multiselect',
      } as EnhancedFieldMetaData);

      expect(result.length).toBe(2);
      expect(result).toStrictEqual([42, 43]);
    });

    it('should convert empty multiselect field value to undefined', () => {
      const result = formFieldToResilientFieldValue(['42', ''], {
        input_type: 'multiselect',
      } as EnhancedFieldMetaData);

      expect(result.length).toBe(1);
      expect(result[0]).toBe(42);
    });

    it('should convert number field to number', () => {
      const result = formFieldToResilientFieldValue('123', {
        input_type: 'number',
      } as EnhancedFieldMetaData);

      expect(result).toBe(123);
    });

    it('should convert unset number field to undefined', () => {
      const result = formFieldToResilientFieldValue('', {
        input_type: 'number',
      } as EnhancedFieldMetaData);

      expect(result).toBeNull();
    });

    it('should return the same text for text types', () => {
      const text = 'some text';
      const result = formFieldToResilientFieldValue(text, {
        input_type: 'text',
      } as EnhancedFieldMetaData);

      expect(result).toBe(text);
    });

    it('should interpret empty values in boolean fields as false', () => {
      const result = formFieldToResilientFieldValue('', {
        input_type: 'boolean',
      } as EnhancedFieldMetaData);

      expect(result).toBe(false);
    });
  });
});
