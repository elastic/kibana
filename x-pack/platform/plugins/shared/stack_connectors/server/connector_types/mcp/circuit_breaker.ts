/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/logging';
import { clientTypes } from '@kbn/connector-specs/server';
import {
  createRetryableError,
  createTaskRunError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';

export const BREAKER_FAILURE_THRESHOLD = 3;
export const BREAKER_COOLING_MS = 60 * 1000;
export const BREAKER_STATE_MAX_SIZE = 1000;
export const BREAKER_STATE_TTL_MS = 2 * BREAKER_COOLING_MS;

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  coolingMs?: number;
  now?: () => number;
}

export interface BreakerRun {
  key: string;
  connectorId: string;
  logger: Logger;
}

interface BreakerEntry {
  failures: number;
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

/**
 * True for connect-phase failures only, tagged by markConnectFailure. User errors, request
 * timeouts and tool errors from a connected client return false: they say nothing about whether
 * the server can be reached.
 */
export const isConnectionFailure = (err: unknown): boolean => {
  if (clientTypes.mcp.isUserError?.(err)) {
    return false;
  }
  return typeof err === 'object' && err !== null && connectFailures.has(err);
};

/** Opens a per-lease-key breaker after consecutive connection failures and fails fast while open. */
export class McpCircuitBreaker {
  private readonly failureThreshold: number;
  private readonly coolingMs: number;
  private readonly now: () => number;
  private readonly breakers: LRUCache<string, BreakerEntry>;
  // Callers sharing one pooled build all reject with the same error: count it once.
  private readonly countedErrors = new WeakSet<object>();

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? BREAKER_FAILURE_THRESHOLD;
    this.coolingMs = options.coolingMs ?? BREAKER_COOLING_MS;
    this.now = options.now ?? (() => Date.now());
    this.breakers = new LRUCache<string, BreakerEntry>({
      max: BREAKER_STATE_MAX_SIZE,
      ttl: BREAKER_STATE_TTL_MS,
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
        if (!this.countedErrors.has(err as object)) {
          this.countedErrors.add(err as object);
          this.recordFailure(ctx);
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

  private recordFailure(ctx: BreakerRun): void {
    const now = this.now();
    const entry = this.breakers.get(ctx.key) ?? { failures: 0 };

    // Calls admitted before the breaker opened must not extend the cooling window.
    if (entry.openUntil !== undefined && now < entry.openUntil) {
      return;
    }

    entry.failures += 1;
    if (entry.failures >= this.failureThreshold) {
      entry.openUntil = now + this.coolingMs;
      ctx.logger.warn(
        `MCP server for connector "${ctx.connectorId}" is unavailable after ${
          entry.failures
        } connection failures, next attempt in ${this.secondsUntil(entry.openUntil)}s`
      );
    }
    this.breakers.set(ctx.key, entry);
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
