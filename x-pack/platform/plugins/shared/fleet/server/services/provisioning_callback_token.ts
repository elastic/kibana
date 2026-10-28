/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/** Fields of a callback record the token is bound to; changing any of them breaks the hash. */
export interface ProvisioningCallbackTokenBinding {
  callbackId: string;
  spaceId: string | undefined;
  expiresAt: string;
}

const TOKEN_BYTES = 32;
const HEX_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/**
 * HMAC-SHA256 of the record's identity, keyed by the token. The token is the only key, so the
 * hash is worthless without it, and the record's id, space and expiry cannot be altered under a
 * stored hash without breaking it. There is no server-side secret to configure or rotate.
 */
const hashToken = (
  token: string,
  { callbackId, spaceId, expiresAt }: ProvisioningCallbackTokenBinding
): string =>
  createHmac('sha256', token)
    .update(`${callbackId}|${spaceId ?? ''}|${expiresAt}`)
    .digest('hex');

/** A fresh 256-bit token for the record, and the only thing stored about it. */
export const mintProvisioningCallbackToken = (
  binding: ProvisioningCallbackTokenBinding
): { token: string; tokenHash: string } => {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  return { token, tokenHash: hashToken(token, binding) };
};

/** Whether a presented token is the record's own; the comparison takes constant time. */
export const isProvisioningCallbackTokenValid = (
  token: string | undefined,
  binding: ProvisioningCallbackTokenBinding,
  storedHash: string | undefined
): boolean => {
  if (!token || !storedHash || !HEX_TOKEN_PATTERN.test(token)) {
    return false;
  }
  const computed = Buffer.from(hashToken(token, binding), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return computed.length === stored.length && timingSafeEqual(computed, stored);
};
