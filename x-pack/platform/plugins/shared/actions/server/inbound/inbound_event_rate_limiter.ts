/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InboundEventRateLimitConfig } from '../actions_config';

export type InboundEventRateLimitBudgetName = 'remoteAddress' | 'connector';

export type InboundEventRateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

interface WindowState {
  windowStartMs: number;
  count: number;
  previousCount: number;
}

const alignWindow = (now: number, windowMs: number): number =>
  Math.floor(now / windowMs) * windowMs;

const windowRetrySeconds = (windowMs: number): number => Math.max(1, Math.ceil(windowMs / 1000));

const normalizeWindow = (state: WindowState, now: number, windowMs: number): WindowState => {
  const windowStartMs = alignWindow(now, windowMs);
  if (windowStartMs === state.windowStartMs) {
    return state;
  }
  if (windowStartMs < state.windowStartMs) {
    return { windowStartMs, count: 0, previousCount: 0 };
  }
  const windowsSkipped = Math.round((windowStartMs - state.windowStartMs) / windowMs);
  return {
    windowStartMs,
    count: 0,
    previousCount: windowsSkipped === 1 ? state.count : 0,
  };
};

const estimateCount = (state: WindowState, now: number, windowMs: number): number => {
  const elapsed = now - state.windowStartMs;
  const weight = 1 - elapsed / windowMs;
  return state.count + state.previousCount * weight;
};

const retryAfterSeconds = (
  state: WindowState,
  now: number,
  limit: number,
  windowMs: number
): number => {
  const retryAtMs =
    state.count >= limit || state.previousCount === 0
      ? state.windowStartMs + windowMs
      : state.windowStartMs + windowMs * (1 - (limit - state.count) / state.previousCount);
  const seconds = Math.ceil((retryAtMs - now) / 1000);
  return Math.min(windowRetrySeconds(windowMs), Math.max(1, seconds));
};

/** Sliding-window counters for the inbound address and connector budgets. */
export class InboundEventRateLimiter {
  private readonly remoteAddressWindows = new Map<string, WindowState>();
  private readonly connectorWindows = new Map<string, WindowState>();

  constructor(private readonly config: InboundEventRateLimitConfig) {}

  /** Returns denied when this socket and connector are already over the failed-auth budget. Does not increment. */
  peekRemoteAddress(key: string): InboundEventRateLimitDecision {
    return this.decide('remoteAddress', key, false);
  }

  /** Call only after the connector has loaded and the token was rejected. */
  recordRemoteAddressFailure(key: string): void {
    this.decide('remoteAddress', key, true);
  }

  consume(budget: 'connector', key: string): InboundEventRateLimitDecision {
    return this.decide(budget, key, true);
  }

  private decide(
    budget: InboundEventRateLimitBudgetName,
    key: string,
    write: boolean
  ): InboundEventRateLimitDecision {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const { limit, windowMs } = this.config[budget];
    const windows = this.windowsFor(budget);
    const now = Date.now();
    const existing = windows.get(key);

    if (!existing) {
      if (!write) {
        return { allowed: true };
      }
      // A full map refuses a new key. A peek of a key that is not stored stays allowed.
      if (windows.size >= this.config.maxKeys && !this.sweep(windows, now, windowMs)) {
        return { allowed: false, retryAfterSeconds: windowRetrySeconds(windowMs) };
      }
      windows.set(key, {
        windowStartMs: alignWindow(now, windowMs),
        count: 1,
        previousCount: 0,
      });
      return { allowed: true };
    }

    const normalized = normalizeWindow(existing, now, windowMs);
    if (estimateCount(normalized, now, windowMs) >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(normalized, now, limit, windowMs),
      };
    }
    if (write) {
      windows.set(key, { ...normalized, count: normalized.count + 1 });
    }
    return { allowed: true };
  }

  private windowsFor(budget: InboundEventRateLimitBudgetName): Map<string, WindowState> {
    return budget === 'remoteAddress' ? this.remoteAddressWindows : this.connectorWindows;
  }

  private sweep(windows: Map<string, WindowState>, now: number, windowMs: number): boolean {
    for (const [key, state] of windows) {
      if (state.windowStartMs + 2 * windowMs < now) {
        windows.delete(key);
      }
    }
    return windows.size < this.config.maxKeys;
  }
}
