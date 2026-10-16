/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { ObservablesUserActionPayloadSchema, ObservablesUserActionSchema } from './v1';

describe('Observables', () => {
  describe('ObservablesUserActionPayloadSchema', () => {
    const defaultRequest = {
      observables: {
        count: 1,
        actionType: 'add',
      },
    };

    it('has expected attributes in request', () => {
      const result = ObservablesUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ObservablesUserActionPayloadSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from observables', () => {
      const result = ObservablesUserActionPayloadSchema.safeParse({
        observables: { ...defaultRequest.observables, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('ObservablesUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.observables,
      payload: {
        observables: {
          count: 1,
          actionType: 'add',
        },
      },
    };

    it('has expected attributes in request', () => {
      const result = ObservablesUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ObservablesUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = ObservablesUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
