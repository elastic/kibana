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

  it('accepts all three condition types with an operator', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [
        { type: 'field_change', field: 'host.name' },
        { type: 'severity_change' },
        { type: 'severity_equals', value: 'critical' },
      ],
      condition_operator: 'all',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a severity_equals value outside the supported levels', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ type: 'severity_equals', value: 'warning' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown condition operator', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ type: 'severity_change' }],
      condition_operator: 'some',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a field_change without a field', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({
      conditions: [{ type: 'field_change' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level properties (strict body)', () => {
    const result = createSnoozeAlertActionBodySchema.safeParse({ unexpected: true });
    expect(result.success).toBe(false);
  });
});
