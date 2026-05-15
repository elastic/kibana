/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveSalt } from './derive_salt';

describe('deriveSalt', () => {
  it('is deterministic: same inputs always produce the same salt', () => {
    const salt1 = deriveSalt('session-abc', 'server-secret-xyz');
    const salt2 = deriveSalt('session-abc', 'server-secret-xyz');
    expect(salt1).toBe(salt2);
  });

  it('produces different salts for different sessionIds (cross-session isolation)', () => {
    const salt1 = deriveSalt('session-abc', 'server-secret-xyz');
    const salt2 = deriveSalt('session-def', 'server-secret-xyz');
    expect(salt1).not.toBe(salt2);
  });

  it('produces different salts for different server secrets', () => {
    const salt1 = deriveSalt('session-abc', 'secret-1');
    const salt2 = deriveSalt('session-abc', 'secret-2');
    expect(salt1).not.toBe(salt2);
  });

  it('returns a hex string of 64 characters (SHA-256 output)', () => {
    const salt = deriveSalt('some-session', 'some-secret');
    expect(salt).toMatch(/^[0-9a-f]{64}$/);
  });

  it('salt changes between turns when sessionId changes (not same session)', () => {
    const turn1 = deriveSalt('conv-001-turn-1', 'secret');
    const turn2 = deriveSalt('conv-001-turn-2', 'secret');
    expect(turn1).not.toBe(turn2);
  });

  it('salt is stable within the same session across turns (cross-turn determinism)', () => {
    const sessionId = 'conv-001';
    const secret = 'server-secret';
    const salt = deriveSalt(sessionId, secret);
    expect(deriveSalt(sessionId, secret)).toBe(salt);
    expect(deriveSalt(sessionId, secret)).toBe(salt);
  });
});
