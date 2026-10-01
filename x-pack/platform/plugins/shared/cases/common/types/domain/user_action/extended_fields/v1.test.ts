/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import {
  ExtendedFieldsSchema,
  ExtendedFieldsUserActionPayloadSchema,
  ExtendedFieldsUserActionSchema,
} from './v1';

describe('ExtendedFields', () => {
  describe('ExtendedFieldsSchema', () => {
    it('accepts a record of string to string', () => {
      const result = ExtendedFieldsSchema.safeParse({ risk_score: 'high', severity: 'medium' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ risk_score: 'high', severity: 'medium' });
    });

    it('rejects a record with non-string values', () => {
      const result = ExtendedFieldsSchema.safeParse({ risk_score: 42 });
      expect(result.success).toBe(false);
    });

    it('accepts an empty record', () => {
      const result = ExtendedFieldsSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({});
    });
  });

  describe('ExtendedFieldsUserActionPayloadSchema', () => {
    const defaultRequest = {
      extended_fields: { risk_score: 'high' },
    };

    it('has expected attributes in request', () => {
      const result = ExtendedFieldsUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ExtendedFieldsUserActionPayloadSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('ExtendedFieldsUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.extended_fields,
      payload: {
        extended_fields: { risk_score: 'high' },
      },
    };

    it('has expected attributes in request', () => {
      const result = ExtendedFieldsUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ExtendedFieldsUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = ExtendedFieldsUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
