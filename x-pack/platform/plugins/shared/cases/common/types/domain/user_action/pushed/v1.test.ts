/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import {
  PushedUserActionPayloadWithoutConnectorIdSchema,
  PushedUserActionPayloadSchema,
  PushedUserActionWithoutConnectorIdSchema,
  PushedUserActionSchema,
} from './v1';

describe('Pushed', () => {
  describe('PushedUserActionPayloadWithoutConnectorIdSchema', () => {
    const defaultRequest = {
      externalService: {
        connector_name: 'My SN connector',
        external_id: 'external_id',
        external_title: 'external title',
        external_url: 'basicPush.com',
        pushed_at: '2023-01-17T09:46:29.813Z',
        pushed_by: {
          full_name: 'Leslie Knope',
          username: 'lknope',
          email: 'leslie.knope@elastic.co',
        },
      },
    };

    it('has expected attributes in request', () => {
      const result = PushedUserActionPayloadWithoutConnectorIdSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = PushedUserActionPayloadWithoutConnectorIdSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from externalService', () => {
      const result = PushedUserActionPayloadWithoutConnectorIdSchema.safeParse({
        externalService: { ...defaultRequest.externalService, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('PushedUserActionPayloadSchema', () => {
    const defaultRequest = {
      externalService: {
        connector_id: 'servicenow-1',
        connector_name: 'My SN connector',
        external_id: 'external_id',
        external_title: 'external title',
        external_url: 'basicPush.com',
        pushed_at: '2023-01-17T09:46:29.813Z',
        pushed_by: {
          full_name: 'Leslie Knope',
          username: 'lknope',
          email: 'leslie.knope@elastic.co',
        },
      },
    };

    it('has expected attributes in request', () => {
      const result = PushedUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = PushedUserActionPayloadSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from externalService', () => {
      const result = PushedUserActionPayloadSchema.safeParse({
        externalService: { ...defaultRequest.externalService, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('PushedUserActionWithoutConnectorIdSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.pushed,
      payload: {
        externalService: {
          connector_name: 'My SN connector',
          external_id: 'external_id',
          external_title: 'external title',
          external_url: 'basicPush.com',
          pushed_at: '2023-01-17T09:46:29.813Z',
          pushed_by: {
            full_name: 'Leslie Knope',
            username: 'lknope',
            email: 'leslie.knope@elastic.co',
          },
        },
      },
    };

    it('has expected attributes in request', () => {
      const result = PushedUserActionWithoutConnectorIdSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = PushedUserActionWithoutConnectorIdSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = PushedUserActionWithoutConnectorIdSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('PushedUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.pushed,
      payload: {
        externalService: {
          connector_id: 'servicenow-1',
          connector_name: 'My SN connector',
          external_id: 'external_id',
          external_title: 'external title',
          external_url: 'basicPush.com',
          pushed_at: '2023-01-17T09:46:29.813Z',
          pushed_by: {
            full_name: 'Leslie Knope',
            username: 'lknope',
            email: 'leslie.knope@elastic.co',
          },
        },
      },
    };

    it('has expected attributes in request', () => {
      const result = PushedUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = PushedUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from externalService', () => {
      const result = PushedUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
