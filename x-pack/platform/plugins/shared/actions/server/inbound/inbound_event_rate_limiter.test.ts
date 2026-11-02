/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InboundEventRateLimitConfig } from '../actions_config';
import { InboundEventRateLimiter } from './inbound_event_rate_limiter';

const WINDOW_MS = 60_000;

const config = (
  overrides: Partial<InboundEventRateLimitConfig> = {}
): InboundEventRateLimitConfig => ({
  enabled: true,
  maxKeys: 10_000,
  remoteAddress: { limit: 10, windowMs: WINDOW_MS },
  connector: { limit: 10, windowMs: WINDOW_MS },
  ...overrides,
});

const consumeUntilDenied = (
  limiter: InboundEventRateLimiter,
  key: string
): { allowed: number; retryAfterSeconds: number } => {
  let allowed = 0;
  while (allowed < 100) {
    const decision = limiter.consume('connector', key);
    if (!decision.allowed) {
      return { allowed, retryAfterSeconds: decision.retryAfterSeconds };
    }
    allowed += 1;
  }
  throw new Error('consume stayed allowed past the test bound');
};

describe('InboundEventRateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays allowed under the limit and the next call still sees the count', () => {
    const limiter = new InboundEventRateLimiter(
      config({ connector: { limit: 3, windowMs: WINDOW_MS } })
    );

    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: true });
    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: true });
    expect(consumeUntilDenied(limiter, 'c1').allowed).toBe(1);
  });

  it('denies the call after the limit', () => {
    const limiter = new InboundEventRateLimiter(
      config({ connector: { limit: 3, windowMs: WINDOW_MS } })
    );

    expect(consumeUntilDenied(limiter, 'c1')).toEqual({ allowed: 3, retryAfterSeconds: 60 });
  });

  it('still denies at half a window when the previous window was full and this window already has a count', () => {
    const limiter = new InboundEventRateLimiter(
      config({ connector: { limit: 2, windowMs: WINDOW_MS } })
    );

    expect(consumeUntilDenied(limiter, 'c1').allowed).toBe(2);

    jest.advanceTimersByTime(WINDOW_MS + 1000);
    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: true });
    expect(limiter.consume('connector', 'c1').allowed).toBe(false);

    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z').getTime() + WINDOW_MS + WINDOW_MS / 2);
    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it('carries the previous window count into the next window and restarts the current count', () => {
    const limiter = new InboundEventRateLimiter(
      config({ connector: { limit: 5, windowMs: WINDOW_MS } })
    );

    expect(limiter.consume('connector', 'c1').allowed).toBe(true);
    expect(limiter.consume('connector', 'c1').allowed).toBe(true);
    expect(limiter.consume('connector', 'c1').allowed).toBe(true);

    jest.advanceTimersByTime(WINDOW_MS);
    expect(consumeUntilDenied(limiter, 'c1').allowed).toBe(2);
  });

  it('drops the previous count after a gap of two windows', () => {
    const limiter = new InboundEventRateLimiter(
      config({ connector: { limit: 2, windowMs: WINDOW_MS } })
    );

    expect(consumeUntilDenied(limiter, 'c1').allowed).toBe(2);

    jest.advanceTimersByTime(2 * WINDOW_MS);
    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: true });
  });

  it('returns a retry delay of at least 1 second and at most the window', () => {
    const limiter = new InboundEventRateLimiter(
      config({ connector: { limit: 1, windowMs: WINDOW_MS } })
    );

    limiter.consume('connector', 'c1');
    const atStart = limiter.consume('connector', 'c1');
    expect(atStart).toEqual({ allowed: false, retryAfterSeconds: 60 });

    jest.advanceTimersByTime(WINDOW_MS - 500);
    const nearEnd = limiter.consume('connector', 'c1');
    expect(nearEnd.allowed).toBe(false);
    if (!nearEnd.allowed) {
      expect(nearEnd.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(nearEnd.retryAfterSeconds).toBeLessThanOrEqual(60);
      expect(nearEnd.retryAfterSeconds).toBe(1);
    }
  });

  it('uses the previous-window weight when the current count is still under the limit', () => {
    const limiter = new InboundEventRateLimiter(
      config({ connector: { limit: 2, windowMs: WINDOW_MS } })
    );

    limiter.consume('connector', 'c1');
    limiter.consume('connector', 'c1');
    jest.advanceTimersByTime(WINDOW_MS + 15_000);
    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: true });

    const denied = limiter.consume('connector', 'c1');
    expect(denied).toEqual({ allowed: false, retryAfterSeconds: 15 });
  });

  it('never denies and stores nothing when disabled', () => {
    const limiter = new InboundEventRateLimiter(
      config({
        enabled: false,
        maxKeys: 1,
        remoteAddress: { limit: 1, windowMs: WINDOW_MS },
        connector: { limit: 1, windowMs: WINDOW_MS },
      })
    );

    expect(limiter.peekRemoteAddress('ip-1')).toEqual({ allowed: true });
    limiter.recordRemoteAddressFailure('ip-1');
    limiter.recordRemoteAddressFailure('ip-2');
    expect(limiter.peekRemoteAddress('ip-1')).toEqual({ allowed: true });
    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: true });
    expect(limiter.consume('connector', 'c2')).toEqual({ allowed: true });
  });

  it('does not increment the address budget on peek', () => {
    const limiter = new InboundEventRateLimiter(
      config({ remoteAddress: { limit: 1, windowMs: WINDOW_MS } })
    );

    expect(limiter.peekRemoteAddress('ip-1')).toEqual({ allowed: true });
    expect(limiter.peekRemoteAddress('ip-1')).toEqual({ allowed: true });
    limiter.recordRemoteAddressFailure('ip-1');
    expect(limiter.peekRemoteAddress('ip-1')).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('does not record another address failure once that budget is already spent', () => {
    const limiter = new InboundEventRateLimiter(
      config({ remoteAddress: { limit: 1, windowMs: WINDOW_MS } })
    );

    limiter.recordRemoteAddressFailure('ip-1');
    limiter.recordRemoteAddressFailure('ip-1');
    jest.advanceTimersByTime(WINDOW_MS + 1);
    expect(limiter.peekRemoteAddress('ip-1')).toEqual({ allowed: true });
  });

  it('allows a peek for an untracked key when the map is full of live keys', () => {
    const limiter = new InboundEventRateLimiter(config({ maxKeys: 1 }));

    limiter.recordRemoteAddressFailure('ip-1');
    limiter.recordRemoteAddressFailure('ip-2');

    expect(limiter.peekRemoteAddress('ip-1')).toEqual({ allowed: true });
    expect(limiter.peekRemoteAddress('ip-2')).toEqual({ allowed: true });
    expect(limiter.peekRemoteAddress('ip-3')).toEqual({ allowed: true });
  });

  it('denies a new key when the map is full of live keys and accepts it after both windows are dead', () => {
    const limiter = new InboundEventRateLimiter(config({ maxKeys: 2 }));

    expect(limiter.consume('connector', 'c1').allowed).toBe(true);
    expect(limiter.consume('connector', 'c2').allowed).toBe(true);
    expect(limiter.consume('connector', 'c3')).toEqual({ allowed: false, retryAfterSeconds: 60 });

    jest.advanceTimersByTime(2 * WINDOW_MS);
    expect(limiter.consume('connector', 'c3')).toEqual({ allowed: false, retryAfterSeconds: 60 });

    jest.advanceTimersByTime(1);
    expect(limiter.consume('connector', 'c3')).toEqual({ allowed: true });
  });

  it('keeps a separate key cap for the address map and the connector map', () => {
    const limiter = new InboundEventRateLimiter(
      config({
        maxKeys: 1,
        remoteAddress: { limit: 2, windowMs: WINDOW_MS },
        connector: { limit: 2, windowMs: WINDOW_MS },
      })
    );

    limiter.recordRemoteAddressFailure('ip-1');
    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: true });
    expect(limiter.consume('connector', 'c2')).toEqual({ allowed: false, retryAfterSeconds: 60 });

    limiter.recordRemoteAddressFailure('ip-2');
    limiter.recordRemoteAddressFailure('ip-1');
    expect(limiter.peekRemoteAddress('ip-1')).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(limiter.consume('connector', 'c1')).toEqual({ allowed: true });
  });
});
