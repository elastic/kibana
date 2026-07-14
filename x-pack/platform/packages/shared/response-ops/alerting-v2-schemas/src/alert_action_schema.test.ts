/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSnoozeAlertActionBodySchema } from './alert_action_schema';

describe('createSnoozeAlertActionBodySchema', () => {
  it('accepts an empty body (indefinite, unconditional snooze)', () => {
    expect(createSnoozeAlertActionBodySchema.safeParse({}).success).toBe(true);
  });

  it('accepts an expiry only', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      expiry: '2026-05-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts eq and changed conditions with a match combinator', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [
        { field: 'data.host.name', operator: 'changed' },
        { field: 'severity', operator: 'changed' },
        { field: 'severity', operator: 'eq', value: 'critical' },
      ],
      match: 'all',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an eq value outside the supported severity levels', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'severity', operator: 'eq', value: 'warning' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an eq condition on a non-watchable field', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'data.host.name', operator: 'eq', value: 'critical' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown match combinator', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'severity', operator: 'changed' }],
      match: 'some',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a changed condition without a field', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ operator: 'changed' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a changed condition on a field outside severity and data.*', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'host.name', operator: 'changed' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown operator', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ field: 'severity', operator: 'gte', value: 'high' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level properties (strict body)', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({ unexpected: true });
    expect(result.success).toBe(false);
  });
});
