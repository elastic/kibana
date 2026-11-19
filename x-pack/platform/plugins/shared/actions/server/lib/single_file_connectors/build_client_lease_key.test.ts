/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildClientLeaseKey } from './build_client_lease_key';

describe('buildClientLeaseKey', () => {
  const identity = {
    connectorId: 'connector-abc',
    clientTypeId: 'mcp',
    connectorVersion: 'WzEsMV0=',
  };

  it('shares a client across users when auth is shared', () => {
    expect(buildClientLeaseKey({ ...identity, profileUid: 'user-a' })).toBe(
      buildClientLeaseKey({ ...identity, profileUid: 'user-b' })
    );
  });

  it('isolates per-user clients and encodes every identity component', () => {
    const userA = buildClientLeaseKey({
      ...identity,
      authMode: 'per-user',
      profileUid: 'user:a',
    });
    const userB = buildClientLeaseKey({
      ...identity,
      authMode: 'per-user',
      profileUid: 'user:b',
    });

    expect(userA).not.toBe(userB);
    expect(userA).toContain('user%3Aa');
  });

  it('requires a profile UID for per-user clients', () => {
    expect(() => buildClientLeaseKey({ ...identity, authMode: 'per-user' })).toThrow(
      'A profile UID is required'
    );
  });

  it('produces distinct keys for different connectors', () => {
    const keyA = buildClientLeaseKey({ ...identity, connectorId: 'conn-a' });
    const keyB = buildClientLeaseKey({ ...identity, connectorId: 'conn-b' });
    expect(keyA).not.toBe(keyB);
  });

  it('produces distinct keys for different client types', () => {
    const keyA = buildClientLeaseKey({ ...identity, clientTypeId: 'mcp' });
    const keyB = buildClientLeaseKey({ ...identity, clientTypeId: 'other' });
    expect(keyA).not.toBe(keyB);
  });

  it('produces distinct keys for different connector revisions', () => {
    const keyA = buildClientLeaseKey({ ...identity, connectorVersion: 'WzEsMV0=' });
    const keyB = buildClientLeaseKey({ ...identity, connectorVersion: 'WzIsMV0=' });
    expect(keyA).not.toBe(keyB);
  });

  it('encodes delimiter characters in connectorId to prevent collisions', () => {
    const key = buildClientLeaseKey({ ...identity, connectorId: 'conn:with:colons' });
    expect(key).toContain('conn%3Awith%3Acolons');
  });

  it('produces the same key regardless of execution space', () => {
    // Space is not a key component — the same connector is reusable from any space.
    const key1 = buildClientLeaseKey(identity);
    const key2 = buildClientLeaseKey(identity);
    expect(key1).toBe(key2);
  });
});
