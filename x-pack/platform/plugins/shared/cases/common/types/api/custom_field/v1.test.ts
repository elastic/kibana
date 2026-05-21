/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../constants';
import {
  CaseCustomFieldTextWithValidationValueRt,
  CustomFieldPutRequestRt,
  CaseCustomFieldNumberWithValidationValueRt,
} from './v1';
import {
  CaseCustomFieldTextWithValidationValueSchema,
  CustomFieldPutRequestSchema,
  CaseCustomFieldNumberWithValidationValueSchema,
} from '../../api_zod/custom_field/v1';

describe('Custom Fields', () => {
  describe('CaseCustomFieldTextWithValidationValueRt', () => {
    const customFieldValueType = CaseCustomFieldTextWithValidationValueRt('value');

    it('decodes strings correctly', () => {
      const query = customFieldValueType.decode('foobar');

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: 'foobar',
      });
    });

    it('the value cannot be empty', () => {
      expect(PathReporter.report(customFieldValueType.decode(''))[0]).toContain(
        'The value field cannot be an empty string.'
      );
    });

    it(`limits the length to ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      expect(
        PathReporter.report(
          customFieldValueType.decode('#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1))
        )[0]
      ).toContain(
        `The length of the value is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}.`
      );
    });
  });

  describe('CaseCustomFieldTextWithValidationValueSchema (zod)', () => {
    const customFieldValueType = CaseCustomFieldTextWithValidationValueSchema('value');

    it('zod: decodes strings correctly', () => {
      const result = customFieldValueType.safeParse('foobar');
      expect(result.success).toBe(true);
      expect(result.data).toBe('foobar');
    });

    it('zod: the value cannot be empty', () => {
      const result = customFieldValueType.safeParse('');
      expect(result.success).toBe(false);
    });

    it(`zod: limits the length to ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      const result = customFieldValueType.safeParse(
        '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1)
      );
      expect(result.success).toBe(false);
    });
  });

  describe('CustomFieldPutRequestRt', () => {
    const defaultRequest = {
      caseVersion: 'WzQ3LDFd',
      value: 'this is a text field value',
    };

    it('has expected attributes in request', () => {
      const query = CustomFieldPutRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('has expected attributes of toggle field in request', () => {
      const newRequest = {
        caseVersion: 'WzQ3LDFd',
        value: false,
      };
      const query = CustomFieldPutRequestRt.decode(newRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: newRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CustomFieldPutRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it(`throws an error when a text customField is longer than ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      expect(
        PathReporter.report(
          CustomFieldPutRequestRt.decode({
            caseVersion: 'WzQ3LDFd',
            value: '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1),
          })
        )
      ).toContain(
        `The length of the value is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}.`
      );
    });

    it('throws an error when a text customField is empty', () => {
      expect(
        PathReporter.report(
          CustomFieldPutRequestRt.decode({
            caseVersion: 'WzQ3LDFd',
            value: '',
          })
        )
      ).toContain('The value field cannot be an empty string.');
    });

    it('zod: has expected attributes in request', () => {
      const result = CustomFieldPutRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const result = CustomFieldPutRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CaseCustomFieldNumberWithValidationValueSchema (zod)', () => {
    const numberCustomFieldValueType = CaseCustomFieldNumberWithValidationValueSchema({
      fieldName: 'value',
    });

    it('zod: should decode number correctly', () => {
      const result = numberCustomFieldValueType.safeParse(123);
      expect(result.success).toBe(true);
      expect(result.data).toBe(123);
    });

    it('zod: should not be more than Number.MAX_SAFE_INTEGER', () => {
      const result = numberCustomFieldValueType.safeParse(Number.MAX_SAFE_INTEGER + 1);
      expect(result.success).toBe(false);
    });
  });

  describe('CaseCustomFieldNumberWithValidationValueRt', () => {
    const numberCustomFieldValueType = CaseCustomFieldNumberWithValidationValueRt({
      fieldName: 'value',
    });
    it('should decode number correctly', () => {
      const query = numberCustomFieldValueType.decode(123);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: 123,
      });
    });

    it('should not be more than Number.MAX_SAFE_INTEGER', () => {
      expect(
        PathReporter.report(numberCustomFieldValueType.decode(Number.MAX_SAFE_INTEGER + 1))[0]
      ).toContain(
        'The value field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.'
      );
    });

    it('should not be less than Number.MIN_SAFE_INTEGER', () => {
      expect(
        PathReporter.report(numberCustomFieldValueType.decode(Number.MIN_SAFE_INTEGER - 1))[0]
      ).toContain(
        'The value field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.'
      );
    });
  });
});
