/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSignalEventDataSchema } from './create_signal_event_data_schema';

describe('createSignalEventDataSchema', () => {
  it('accepts a signal with only a source', () => {
    expect(createSignalEventDataSchema.safeParse({ source: 'datadog' }).success).toBe(true);
  });

  it('accepts the source, data, timestamp and severity', () => {
    const result = createSignalEventDataSchema.safeParse({
      source: 'datadog',
      data: { message: 'disk almost full' },
      timestamp: '2026-11-06T10:00:00.000Z',
      severity: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional fingerprint or fingerprint_fields', () => {
    expect(
      createSignalEventDataSchema.safeParse({ source: 'datadog', fingerprint: 'fp-1' }).success
    ).toBe(true);
    expect(
      createSignalEventDataSchema.safeParse({
        source: 'datadog',
        fingerprint_fields: ['host'],
        data: { host: 'web-01' },
      }).success
    ).toBe(true);
  });

  it('rejects a missing source', () => {
    expect(createSignalEventDataSchema.safeParse({}).success).toBe(false);
  });

  it('rejects the reserved source prefix', () => {
    expect(createSignalEventDataSchema.safeParse({ source: 'elastic_monitoring' }).success).toBe(
      false
    );
  });

  it('rejects an alert lifecycle status', () => {
    expect(
      createSignalEventDataSchema.safeParse({ source: 'datadog', alert_status: 'active' }).success
    ).toBe(false);
  });

  it('rejects a rule id', () => {
    expect(
      createSignalEventDataSchema.safeParse({ source: 'datadog', rule_id: 'rule-1' }).success
    ).toBe(false);
  });

  it('rejects an invalid severity and unknown keys', () => {
    expect(
      createSignalEventDataSchema.safeParse({ source: 'datadog', severity: 'urgent' }).success
    ).toBe(false);
    expect(createSignalEventDataSchema.safeParse({ source: 'datadog', extra: 1 }).success).toBe(
      false
    );
  });
});
