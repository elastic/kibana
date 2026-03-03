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

  test('allows empty object (indefinite mute, backward compatibility with clients that send empty JSON body)', () => {
    expect(() => muteAlertBodySchema.validate({})).not.toThrow();
    expect(muteAlertBodySchema.validate({})).toEqual({});
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
      conditions: [
        {
          type: 'field_change' as const,
          field: 'kibana.alert.severity',
          snapshot_value: 'critical',
        },
      ],
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

  test('rejects field_change without snapshot_value', () => {
    expect(() =>
      muteAlertBodySchema.validate({
        conditions: [{ type: 'field_change', field: 'kibana.alert.severity' }],
      })
    ).toThrow(`Condition type 'field_change' requires a non-empty snapshot_value.`);
  });

  test('rejects severity_change without snapshot_value', () => {
    expect(() =>
      muteAlertBodySchema.validate({
        conditions: [{ type: 'severity_change', field: 'kibana.alert.severity' }],
      })
    ).toThrow(`Condition type 'severity_change' requires a non-empty snapshot_value.`);
  });

  test('rejects severity_equals without value', () => {
    expect(() =>
      muteAlertBodySchema.validate({
        conditions: [{ type: 'severity_equals', field: 'kibana.alert.severity' }],
      })
    ).toThrow(`Condition type 'severity_equals' requires a non-empty value.`);
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
