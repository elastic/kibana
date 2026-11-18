/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../constants';
import {
  CaseCustomFieldTextWithValidationValueSchema,
  CustomFieldPutRequestSchema,
  CaseCustomFieldNumberWithValidationValueSchema,
} from './v1';

describe('Custom Fields', () => {
  describe('CaseCustomFieldTextWithValidationValueSchema', () => {
    const customFieldValueType = CaseCustomFieldTextWithValidationValueSchema('value');

    it('decodes strings correctly', () => {
      const result = customFieldValueType.safeParse('foobar');
      expect(result.success).toBe(true);
      expect(result.data).toBe('foobar');
    });

    it('the value cannot be empty', () => {
      const result = customFieldValueType.safeParse('');
      expect(result.success).toBe(false);
    });

    it(`limits the length to ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      const result = customFieldValueType.safeParse(
        '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1)
      );
      expect(result.success).toBe(false);
    });
  });

  describe('CustomFieldPutRequestSchema', () => {
    const defaultRequest = {
      caseVersion: 'WzQ3LDFd',
      value: 'this is a text field value',
    };

    it('has expected attributes in request', () => {
      const result = CustomFieldPutRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CustomFieldPutRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it(`does not accept text customField longer than ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      const result = CustomFieldPutRequestSchema.safeParse({
        caseVersion: 'WzQ3LDFd',
        value: '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it('does not accept empty text customField', () => {
      const result = CustomFieldPutRequestSchema.safeParse({
        caseVersion: 'WzQ3LDFd',
        value: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CaseCustomFieldNumberWithValidationValueSchema', () => {
    const numberCustomFieldValueType = CaseCustomFieldNumberWithValidationValueSchema({
      fieldName: 'value',
    });

    it('should decode number correctly', () => {
      const result = numberCustomFieldValueType.safeParse(123);
      expect(result.success).toBe(true);
      expect(result.data).toBe(123);
    });

    it('should not be more than Number.MAX_SAFE_INTEGER', () => {
      const result = numberCustomFieldValueType.safeParse(Number.MAX_SAFE_INTEGER + 1);
      expect(result.success).toBe(false);
    });
  });
});
