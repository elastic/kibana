/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExpiresAtMs, NEVER_EXPIRES_MS, toMemoryNamespace } from './ki_codec';

describe('ki_codec', () => {
  it('builds a sanitized namespace per space and AI index', () => {
    expect(
      toMemoryNamespace({
        parts: ['kibana', 'my space', 'support.logs'],
        separator: ':',
        maxLength: 100,
      })
    ).toBe('kibana:my_space:support_logs');
    expect(
      toMemoryNamespace({ parts: ['k', 's', 'x'.repeat(200)], separator: '/', maxLength: 100 })
    ).toHaveLength(100);
  });

  it('gives non-expiring memories a far-future expiry', () => {
    expect(getExpiresAtMs({ expires_at: '2026-12-23T12:00:00.000Z' })).toBe(
      Date.parse('2026-12-23T12:00:00.000Z')
    );
    expect(getExpiresAtMs({})).toBe(NEVER_EXPIRES_MS);
  });
});
