/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { CustomFieldsUserActionPayloadSchema, CustomFieldsUserActionSchema } from './v1';

describe('Custom field', () => {
  describe('CustomFieldsUserActionPayloadSchema', () => {
    const defaultRequest = {
      customFields: [
        {
          key: 'first_custom_field_key',
          type: 'text',
          value: 'this is a text field value',
        },
      ],
    };

    it('has expected attributes in request', () => {
      const result = CustomFieldsUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CustomFieldsUserActionPayloadSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CustomFieldsUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.customFields,
      payload: {
        customFields: [
          {
            key: 'first_custom_field_key',
            type: 'text',
            value: 'this is a text field value',
          },
        ],
      },
    };

    it('has expected attributes in request', () => {
      const result = CustomFieldsUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CustomFieldsUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = CustomFieldsUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from the field', () => {
      const result = CustomFieldsUserActionSchema.safeParse({
        ...defaultRequest,
        payload: {
          ...defaultRequest.payload,
          customFields: [{ ...defaultRequest.payload.customFields[0], foo: 'bar' }],
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
