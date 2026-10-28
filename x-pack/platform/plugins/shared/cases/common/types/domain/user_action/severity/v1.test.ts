/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../case/v1';
import { UserActionTypes } from '../action/v1';
import { SeverityUserActionPayloadSchema, SeverityUserActionSchema } from './v1';

describe('Severity', () => {
  describe('SeverityUserActionPayloadSchema', () => {
    const defaultRequest = {
      severity: CaseSeverity.MEDIUM,
    };

    it('has expected attributes in request', () => {
      const result = SeverityUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = SeverityUserActionPayloadSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('SeverityUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.severity,
      payload: {
        severity: CaseSeverity.CRITICAL,
      },
    };

    it('has expected attributes in request', () => {
      const result = SeverityUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = SeverityUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = SeverityUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
