/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/logging';
import { StreamableHTTPError, UnauthorizedError } from '@kbn/mcp-client';
import {
  createRetryableError,
  createTaskRunError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';

export const BREAKER_FAILURE_THRESHOLD = 3;
export const BREAKER_INITIAL_COOLING_MS = 60 * 1000;
export const BREAKER_MAX_COOLING_MS = 10 * 60 * 1000;
export const BREAKER_STATE_MAX_SIZE = 1000;
export const BREAKER_STATE_TTL_MS = 2 * BREAKER_MAX_COOLING_MS;

const USER_ERROR_STATUS_CODES = [401, 403];

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  initialCoolingMs?: number;
  maxCoolingMs?: number;
  now?: () => number;
}

export interface BreakerRun {
  key: string;
  connectorId: string;
  logger: Logger;
}

interface BreakerEntry {
  failures: number;
  /** Cooling to apply the next time the breaker opens. Doubles on every open, up to the max. */
  coolingMs: number;
  openUntil?: number;
}

const connectFailures = new WeakSet<object>();

/** Tags a rejected connect error so the breaker can count it even when it is a plain Error. */
export const markConnectFailure = <T>(promise: Promise<T>): Promise<T> =>
  promise.catch((err: unknown) => {
    if (typeof err === 'object' && err !== null) {
      connectFailures.add(err);
    }
    throw err;
  });

/** True for authentication and authorization failures: the server answered, so it is reachable. */
export const isUserError = (err: unknown): boolean => {
  const cause = err instanceof Error ? err.cause : undefined;
  if (cause instanceof UnauthorizedError) {
    return true;
  }
  return cause instanceof StreamableHTTPError && USER_ERROR_STATUS_CODES.includes(cause.code ?? 0);
};

/**
 * True for connect-phase failures only, tagged by markConnectFailure. User errors, request
 * timeouts and tool errors from a connected client return false: they say nothing about whether
 * the server can be reached.
 */
export const isConnectionFailure = (err: unknown): boolean =>
  !isUserError(err) && typeof err === 'object' && err !== null && connectFailures.has(err);

/**
 * Opens a per-key breaker after consecutive connection failures and fails fast while open.
 * The cooling window doubles on every re-open, from the initial value up to the max.
 * When the window ends the next calls run for real (half-open): one more connection failure
 * re-opens the breaker with the doubled window, a success closes it and resets the window.
 */
export class McpCircuitBreaker {
  private readonly failureThreshold: number;
  private readonly initialCoolingMs: number;
  private readonly maxCoolingMs: number;
  private readonly now: () => number;
  private readonly breakers: LRUCache<string, BreakerEntry>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? BREAKER_FAILURE_THRESHOLD;
    this.initialCoolingMs = options.initialCoolingMs ?? BREAKER_INITIAL_COOLING_MS;
    this.maxCoolingMs = options.maxCoolingMs ?? BREAKER_MAX_COOLING_MS;
    this.now = options.now ?? (() => Date.now());
    this.breakers = new LRUCache<string, BreakerEntry>({
      max: BREAKER_STATE_MAX_SIZE,
      ttl: Math.max(BREAKER_STATE_TTL_MS, 2 * this.maxCoolingMs),
      allowStale: false,
      ttlAutopurge: false,
    });
  }

  async run<T>(ctx: BreakerRun, fn: () => Promise<T>): Promise<T> {
    this.admit(ctx);

    try {
      const result = await fn();
      this.recordSuccess(ctx);
      return result;
    } catch (err) {
      if (isConnectionFailure(err)) {
        const opened = this.recordFailure(ctx);
        if (opened) {
          // The failure that opens the breaker must not be re-queued by Task Manager.
          throw createRetryableError(
            createTaskRunError(err as Error, TaskErrorSource.FRAMEWORK),
            false
          );
        }
      } else if (!this.isOpen(ctx)) {
        // A late non-connect error says nothing about reachability: only a result may close an open breaker.
        this.recordSuccess(ctx);
      }
      throw err;
    }
  }

  clear(): void {
    this.breakers.clear();
  }

  private admit(ctx: BreakerRun): void {
    const openUntil = this.breakers.get(ctx.key)?.openUntil;
    if (openUntil !== undefined && this.now() < openUntil) {
      this.throwUnavailable(ctx, openUntil);
    }
  }

  private isOpen(ctx: BreakerRun): boolean {
    const openUntil = this.breakers.get(ctx.key)?.openUntil;
    return openUntil !== undefined && this.now() < openUntil;
  }

  private recordSuccess(ctx: BreakerRun): void {
    const entry = this.breakers.get(ctx.key);
    if (entry === undefined) {
      return;
    }
    this.breakers.delete(ctx.key);
    if (entry.openUntil !== undefined) {
      ctx.logger.warn(`MCP server for connector "${ctx.connectorId}" is available again`);
    }
  }

  /** Returns true when this failure opened the breaker. */
  private recordFailure(ctx: BreakerRun): boolean {
    const now = this.now();
    const entry = this.breakers.get(ctx.key) ?? {
      failures: 0,
      coolingMs: this.initialCoolingMs,
    };

    // Calls admitted before the breaker opened must not extend the cooling window.
    if (entry.openUntil !== undefined && now < entry.openUntil) {
      return false;
    }

    entry.failures += 1;
    const opened = entry.failures >= this.failureThreshold;
    if (opened) {
      entry.openUntil = now + entry.coolingMs;
      entry.coolingMs = Math.min(entry.coolingMs * 2, this.maxCoolingMs);
      ctx.logger.warn(
        `MCP server for connector "${ctx.connectorId}" is unavailable after ${
          entry.failures
        } connection failures, next attempt in ${this.secondsUntil(entry.openUntil)}s`
      );
    }
    this.breakers.set(ctx.key, entry);

    return opened;
  }

  private secondsUntil(openUntil: number): number {
    return Math.ceil(Math.max(0, openUntil - this.now()) / 1000);
  }

  private throwUnavailable(ctx: BreakerRun, openUntil: number): never {
    const message = `MCP server for connector "${
      ctx.connectorId
    }" is unavailable, next attempt in ${this.secondsUntil(openUntil)}s`;
    ctx.logger.debug(message);
    throw createRetryableError(
      createTaskRunError(new Error(message), TaskErrorSource.FRAMEWORK),
      false
    );
  }
}

export const mcpCircuitBreaker = new McpCircuitBreaker();
