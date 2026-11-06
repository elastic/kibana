/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/logging';
import { clientTypes } from '@kbn/connector-specs/server';
import { McpError, McpErrorCode, McpNotConnectedError } from '@kbn/mcp-client';
import {
  createRetryableError,
  createTaskRunError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';

export const BREAKER_FAILURE_THRESHOLD = 3;
export const BREAKER_BASE_COOLING_MS = 60 * 1000;
export const BREAKER_MAX_COOLING_MS = 10 * 60 * 1000;
export const BREAKER_STATE_MAX_SIZE = 1000;
export const BREAKER_STATE_TTL_MS = 2 * BREAKER_MAX_COOLING_MS;

// Thrown by the SDK protocol layer once its transport is gone.
const SDK_NOT_CONNECTED_MESSAGE = 'Not connected';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  baseCoolingMs?: number;
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
  coolingMs: number;
  openUntil?: number;
  probing: boolean;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readCause = (err: unknown): unknown => {
  if (!isRecord(err) || !('cause' in err)) {
    return undefined;
  }
  return err.cause;
};

const matchesErrorOrCause = (err: unknown, predicate: (current: unknown) => boolean): boolean => {
  if (predicate(err)) {
    return true;
  }
  const cause = readCause(err);
  return cause !== undefined && predicate(cause);
};

/**
 * Connect-phase failure shapes. Errors from a tool call on a connected client (request timeouts,
 * HTTP errors, tool errors) are not included: they say nothing about whether the server can be
 * reached.
 */
const isConnectionFailureShape = (current: unknown): boolean => {
  if (current instanceof McpError) {
    return current.code === McpErrorCode.ConnectionClosed;
  }
  if (current instanceof McpNotConnectedError) {
    return true;
  }
  if (current instanceof Error && current.message === SDK_NOT_CONNECTED_MESSAGE) {
    return true;
  }
  if (!isRecord(current)) {
    return false;
  }
  if (current.name === 'McpConnectionTransportError') {
    return true;
  }
  if (current.name === 'McpConnectionHttpError') {
    return typeof current.httpStatus === 'number' && current.httpStatus >= 500;
  }
  return false;
};

/** True for connect-phase failures only. User errors and tool errors return false. */
export const isConnectionFailure = (err: unknown): boolean => {
  if (clientTypes.mcp.isUserError?.(err)) {
    return false;
  }
  if (isRecord(err) && connectFailures.has(err)) {
    return true;
  }
  return matchesErrorOrCause(err, isConnectionFailureShape);
};

/** Opens a per-lease-key breaker after consecutive connection failures and fails fast while open. */
export class McpCircuitBreaker {
  private readonly failureThreshold: number;
  private readonly baseCoolingMs: number;
  private readonly maxCoolingMs: number;
  private readonly now: () => number;
  private readonly breakers: LRUCache<string, BreakerEntry>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? BREAKER_FAILURE_THRESHOLD;
    this.baseCoolingMs = options.baseCoolingMs ?? BREAKER_BASE_COOLING_MS;
    this.maxCoolingMs = options.maxCoolingMs ?? BREAKER_MAX_COOLING_MS;
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
        this.recordFailure(ctx);
      } else {
        this.recordSuccess(ctx);
      }
      throw err;
    }
  }

  clear(): void {
    this.breakers.clear();
  }

  private admit(ctx: BreakerRun): void {
    const entry = this.breakers.get(ctx.key);
    if (entry?.openUntil === undefined) {
      return;
    }

    const now = this.now();
    if (now < entry.openUntil) {
      this.throwUnavailable(ctx, entry.openUntil);
    }
    if (!entry.probing) {
      entry.probing = true;
      this.breakers.set(ctx.key, entry);
      ctx.logger.warn(
        `MCP server for connector "${ctx.connectorId}" is half-open, admitting one probe`
      );
      return;
    }
    this.throwUnavailable(ctx, entry.openUntil);
  }

  private recordSuccess(ctx: BreakerRun): void {
    const entry = this.breakers.get(ctx.key);
    if (entry === undefined) {
      return;
    }
    this.breakers.delete(ctx.key);
    if (entry.openUntil !== undefined || entry.probing) {
      ctx.logger.warn(`MCP server for connector "${ctx.connectorId}" is available again`);
    }
  }

  private recordFailure(ctx: BreakerRun): void {
    const now = this.now();
    const existing = this.breakers.get(ctx.key);

    // Calls admitted before the breaker opened must not double the cooling period.
    if (existing !== undefined && existing.openUntil !== undefined && !existing.probing) {
      return;
    }

    if (existing?.probing) {
      existing.coolingMs = Math.min(existing.coolingMs * 2, this.maxCoolingMs);
      existing.openUntil = now + existing.coolingMs;
      existing.probing = false;
      this.breakers.set(ctx.key, existing);
      ctx.logger.warn(
        `MCP server for connector "${
          ctx.connectorId
        }" probe failed, next attempt in ${this.secondsUntil(existing.openUntil)}s`
      );
      return;
    }

    const entry: BreakerEntry = existing ?? {
      failures: 0,
      coolingMs: this.baseCoolingMs,
      probing: false,
    };
    entry.failures += 1;
    if (entry.failures >= this.failureThreshold) {
      entry.coolingMs = this.baseCoolingMs;
      entry.openUntil = now + entry.coolingMs;
      entry.probing = false;
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
