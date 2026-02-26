/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { muteAlertBodySchema } from './v1';

describe('muteAlertBodySchema', () => {
  test('allows undefined (indefinite mute)', () => {
    expect(() => muteAlertBodySchema.validate(undefined)).not.toThrow();
    expect(muteAlertBodySchema.validate(undefined)).toBeUndefined();
  });

  test('allows null (indefinite mute)', () => {
    expect(() => muteAlertBodySchema.validate(null)).not.toThrow();
    expect(muteAlertBodySchema.validate(null)).toBeNull();
  });

  test('rejects empty body when object is provided', () => {
    expect(() => muteAlertBodySchema.validate({})).toThrow(
      'When providing a request body, at least one of expires_at or conditions (non-empty array) is required. Omit the body for indefinite mute.'
    );
  });

  test('allows body with expires_at only', () => {
    expect(() =>
      muteAlertBodySchema.validate({ expires_at: '2025-12-31T23:59:59Z' })
    ).not.toThrow();
    expect(muteAlertBodySchema.validate({ expires_at: '2025-12-31T23:59:59Z' })).toEqual({
      expires_at: '2025-12-31T23:59:59Z',
    });
  });

  test('allows body with non-empty conditions only', () => {
    const body = {
      conditions: [
        { type: 'severity_equals' as const, field: 'kibana.alert.severity', value: 'low' },
      ],
    };
    expect(() => muteAlertBodySchema.validate(body)).not.toThrow();
    expect(muteAlertBodySchema.validate(body)).toEqual(body);
  });

  test('allows body with both expires_at and conditions', () => {
    const body = {
      expires_at: '2025-12-31T23:59:59Z',
      conditions: [{ type: 'field_change' as const, field: 'kibana.alert.severity' }],
      condition_operator: 'any' as const,
    };
    expect(() => muteAlertBodySchema.validate(body)).not.toThrow();
    expect(muteAlertBodySchema.validate(body)).toEqual(body);
  });

  test('rejects body with only condition_operator (no expires_at or conditions)', () => {
    expect(() => muteAlertBodySchema.validate({ condition_operator: 'all' })).toThrow(
      'When providing a request body, at least one of expires_at or conditions (non-empty array) is required. Omit the body for indefinite mute.'
    );
  });

  test('rejects body with empty conditions array', () => {
    expect(() => muteAlertBodySchema.validate({ conditions: [] })).toThrow(
      'When providing a request body, at least one of expires_at or conditions (non-empty array) is required. Omit the body for indefinite mute.'
    );
  });

  test('rejects invalid expires_at format', () => {
    expect(() => muteAlertBodySchema.validate({ expires_at: 'not-a-date' })).toThrow(
      'expires_at must be a valid ISO 8601 date string'
    );
    expect(() => muteAlertBodySchema.validate({ expires_at: '2025-13-45' })).toThrow(
      'expires_at must be a valid ISO 8601 date string'
    );
  });

  test('accepts valid ISO 8601 expires_at formats', () => {
    expect(muteAlertBodySchema.validate({ expires_at: '2025-12-31T23:59:59.000Z' })).toEqual({
      expires_at: '2025-12-31T23:59:59.000Z',
    });
    expect(muteAlertBodySchema.validate({ expires_at: '2026-01-15T00:00:00Z' })).toEqual({
      expires_at: '2026-01-15T00:00:00Z',
    });
    expect(muteAlertBodySchema.validate({ expires_at: '2026-02-28' })).toEqual({
      expires_at: '2026-02-28',
    });
  });
});
