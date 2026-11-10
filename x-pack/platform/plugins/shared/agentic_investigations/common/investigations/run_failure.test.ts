/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { investigationRunFailedEventSchema } from './run_failure';

const failure = { execution_id: 'exec-1', request: 'Why is checkout slow?', reason: 'Forbidden' };

describe('investigationRunFailedEventSchema', () => {
  it('accepts the boundary lengths', () => {
    expect(
      investigationRunFailedEventSchema.safeParse({
        execution_id: 'e'.repeat(500),
        request: 'q'.repeat(10_000),
        reason: 'r'.repeat(10_000),
      }).success
    ).toBe(true);
  });

  it.each([
    { execution_id: '' },
    { execution_id: 'e'.repeat(501) },
    { request: '' },
    { request: 'q'.repeat(10_001) },
    { reason: '' },
    { reason: 'r'.repeat(10_001) },
  ])('rejects invalid payload fields: %p', (overrides) => {
    expect(investigationRunFailedEventSchema.safeParse({ ...failure, ...overrides }).success).toBe(
      false
    );
  });

  it('accepts a failure without a recoverable request', () => {
    expect(
      investigationRunFailedEventSchema.safeParse({ execution_id: 'exec-1', reason: 'Forbidden' })
        .success
    ).toBe(true);
  });
});
