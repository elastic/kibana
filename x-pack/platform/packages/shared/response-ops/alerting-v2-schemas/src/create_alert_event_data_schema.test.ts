/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertEventDataSchema } from './create_alert_event_data_schema';
import {
  ID_MAX_LENGTH,
  MAX_ALERT_EVENT_DATA_KEYS,
  MAX_FINGERPRINT_FIELDS,
  MAX_FINGERPRINT_LENGTH,
} from './constants';

describe('createAlertEventDataSchema bounds', () => {
  const base = { source: 'datadog', fingerprint: 'fp-1' };

  it('accepts a well-formed body', () => {
    expect(
      createAlertEventDataSchema.safeParse({
        ...base,
        timestamp: '2026-07-29T12:00:00.000Z',
        data: { rule_name: 'CPU high' },
      }).success
    ).toBe(true);
  });

  it('rejects oversized fingerprint / source / fingerprint_fields', () => {
    expect(
      createAlertEventDataSchema.safeParse({
        ...base,
        fingerprint: 'x'.repeat(MAX_FINGERPRINT_LENGTH + 1),
      }).success
    ).toBe(false);
    expect(
      createAlertEventDataSchema.safeParse({
        ...base,
        source: 'x'.repeat(ID_MAX_LENGTH + 1),
      }).success
    ).toBe(false);
    expect(
      createAlertEventDataSchema.safeParse({
        ...base,
        fingerprint: undefined,
        fingerprint_fields: Array.from({ length: MAX_FINGERPRINT_FIELDS + 1 }, (_, i) => `f${i}`),
      }).success
    ).toBe(false);
  });

  it('rejects too many data keys and invalid timestamps', () => {
    const data = Object.fromEntries(
      Array.from({ length: MAX_ALERT_EVENT_DATA_KEYS + 1 }, (_, i) => [`k${i}`, i])
    );
    expect(createAlertEventDataSchema.safeParse({ ...base, data }).success).toBe(false);
    expect(
      createAlertEventDataSchema.safeParse({ ...base, timestamp: 'not-a-datetime' }).success
    ).toBe(false);
  });

  it('requires one of fingerprint, fingerprint_fields, or rule_id', () => {
    expect(createAlertEventDataSchema.safeParse({ source: 'datadog' }).success).toBe(false);
    expect(
      createAlertEventDataSchema.safeParse({ source: 'datadog', rule_id: 'mon-1' }).success
    ).toBe(true);
  });
});
