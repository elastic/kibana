/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isProvisioningCallbackTokenValid,
  mintProvisioningCallbackToken,
} from './provisioning_callback_token';

const BINDING = {
  callbackId: 'cb-1',
  spaceId: 'default',
  expiresAt: '2026-10-13T12:00:00.000Z',
};

describe('provisioning callback token', () => {
  it('mints a 256-bit hex token and a hash that verifies against the same binding', () => {
    const { token, tokenHash } = mintProvisioningCallbackToken(BINDING);

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toBe(token);
    expect(isProvisioningCallbackTokenValid(token, BINDING, tokenHash)).toBe(true);
  });

  it('mints a different token every time', () => {
    const first = mintProvisioningCallbackToken(BINDING);
    const second = mintProvisioningCallbackToken(BINDING);

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it('binds the hash to the record: another id, space or expiry does not verify', () => {
    const { token, tokenHash } = mintProvisioningCallbackToken(BINDING);

    expect(
      isProvisioningCallbackTokenValid(token, { ...BINDING, callbackId: 'cb-2' }, tokenHash)
    ).toBe(false);
    expect(
      isProvisioningCallbackTokenValid(token, { ...BINDING, spaceId: 'other' }, tokenHash)
    ).toBe(false);
    expect(
      isProvisioningCallbackTokenValid(
        token,
        { ...BINDING, expiresAt: '2026-10-14T12:00:00.000Z' },
        tokenHash
      )
    ).toBe(false);
  });

  it('treats a missing space as its own binding', () => {
    const binding = { ...BINDING, spaceId: undefined };
    const { token, tokenHash } = mintProvisioningCallbackToken(binding);

    expect(isProvisioningCallbackTokenValid(token, binding, tokenHash)).toBe(true);
    expect(isProvisioningCallbackTokenValid(token, BINDING, tokenHash)).toBe(false);
  });

  it('rejects a wrong, missing or malformed token and a missing hash', () => {
    const { token, tokenHash } = mintProvisioningCallbackToken(BINDING);
    const other = mintProvisioningCallbackToken(BINDING).token;

    expect(isProvisioningCallbackTokenValid(other, BINDING, tokenHash)).toBe(false);
    expect(isProvisioningCallbackTokenValid(undefined, BINDING, tokenHash)).toBe(false);
    expect(isProvisioningCallbackTokenValid('', BINDING, tokenHash)).toBe(false);
    expect(isProvisioningCallbackTokenValid('not-hex', BINDING, tokenHash)).toBe(false);
    expect(isProvisioningCallbackTokenValid(token, BINDING, undefined)).toBe(false);
    expect(isProvisioningCallbackTokenValid(token, BINDING, '')).toBe(false);
    expect(isProvisioningCallbackTokenValid(token, BINDING, tokenHash.slice(0, 32))).toBe(false);
  });
});
