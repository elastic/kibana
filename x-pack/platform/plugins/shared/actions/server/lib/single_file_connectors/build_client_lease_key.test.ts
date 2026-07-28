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
    spaceId: 'default',
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
});
