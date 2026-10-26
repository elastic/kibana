/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { DescriptionUserActionPayloadSchema, DescriptionUserActionSchema } from './v1';

describe('Description', () => {
  describe('DescriptionUserActionPayloadSchema', () => {
    const defaultRequest = {
      description: 'this is sample description',
    };

    it('has expected attributes in request', () => {
      const result = DescriptionUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = DescriptionUserActionPayloadSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('DescriptionUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.description,
      payload: {
        description: 'this is sample description',
      },
    };

    it('has expected attributes in request', () => {
      const result = DescriptionUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = DescriptionUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = DescriptionUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
