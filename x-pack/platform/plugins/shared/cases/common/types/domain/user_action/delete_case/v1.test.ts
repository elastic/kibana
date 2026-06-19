/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { DeleteCaseUserActionSchema } from './v1';

describe('Delete_case', () => {
  describe('DeleteCaseUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.delete_case,
      payload: {},
    };

    it('has expected attributes in request', () => {
      const result = DeleteCaseUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = DeleteCaseUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = DeleteCaseUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
