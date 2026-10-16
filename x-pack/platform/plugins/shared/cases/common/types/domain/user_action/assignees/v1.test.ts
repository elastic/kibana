/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { AssigneesUserActionPayloadSchema, AssigneesUserActionSchema } from './v1';

describe('Assignees', () => {
  describe('AssigneesUserActionPayloadSchema', () => {
    const defaultRequest = {
      assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
    };

    it('has expected attributes in request', () => {
      const result = AssigneesUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = AssigneesUserActionPayloadSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('AssigneesUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.assignees,
      payload: {
        assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
      },
    };

    it('has expected attributes in request', () => {
      const result = AssigneesUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = AssigneesUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from assignees', () => {
      const result = AssigneesUserActionSchema.safeParse({
        type: UserActionTypes.assignees,
        payload: {
          assignees: [{ uid: '1', foo: 'bar' }, { uid: '2' }, { uid: '3' }],
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({
        type: UserActionTypes.assignees,
        payload: {
          assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
        },
      });
    });

    it('strips unknown fields from payload', () => {
      const result = AssigneesUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
