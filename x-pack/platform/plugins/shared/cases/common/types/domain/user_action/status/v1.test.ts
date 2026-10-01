/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { UserActionTypes } from '../action/v1';
import { StatusUserActionPayloadSchema, StatusUserActionSchema } from './v1';

describe('Status', () => {
  describe('StatusUserActionPayloadSchema', () => {
    const defaultRequest = {
      status: CaseStatuses['in-progress'],
    };

    it('has expected attributes in request', () => {
      const result = StatusUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = StatusUserActionPayloadSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('accepts syncedAlertCount when provided', () => {
      const result = StatusUserActionPayloadSchema.safeParse({
        ...defaultRequest,
        syncedAlertCount: 3,
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ ...defaultRequest, syncedAlertCount: 3 });
    });
  });

  describe('StatusUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.status,
      payload: {
        status: CaseStatuses.closed,
      },
    };

    it('has expected attributes in request', () => {
      const result = StatusUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = StatusUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = StatusUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
