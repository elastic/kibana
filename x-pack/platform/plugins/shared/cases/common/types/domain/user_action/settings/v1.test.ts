/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { SettingsUserActionPayloadSchema, SettingsUserActionSchema } from './v1';

describe('Settings', () => {
  describe('SettingsUserActionPayloadSchema', () => {
    const defaultRequest = {
      settings: { syncAlerts: true, extractObservables: true },
    };

    it('has expected attributes in request', () => {
      const result = SettingsUserActionPayloadSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('has expected attributes in request with only syncAlerts', () => {
      const result = SettingsUserActionPayloadSchema.safeParse({
        settings: { syncAlerts: true },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ settings: { syncAlerts: true } });
    });

    it('has expected attributes in request with only extractObservables', () => {
      const result = SettingsUserActionPayloadSchema.safeParse({
        settings: { extractObservables: true },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ settings: { extractObservables: true } });
    });

    it('strips unknown fields', () => {
      const result = SettingsUserActionPayloadSchema.safeParse({
        settings: { syncAlerts: false, extractObservables: false },
        foo: 'bar',
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({
        settings: { syncAlerts: false, extractObservables: false },
      });
    });
  });

  describe('SettingsUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.settings,
      payload: {
        settings: { syncAlerts: true, extractObservables: true },
      },
    };

    it('has expected attributes in request', () => {
      const result = SettingsUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('has expected attributes in request with only syncAlerts', () => {
      const result = SettingsUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, settings: { syncAlerts: true } },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, settings: { syncAlerts: true } },
      });
    });

    it('has expected attributes in request with only extractObservables', () => {
      const result = SettingsUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, settings: { extractObservables: true } },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, settings: { extractObservables: true } },
      });
    });

    it('strips unknown fields', () => {
      const result = SettingsUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = SettingsUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
