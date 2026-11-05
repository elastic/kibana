/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/logging';
import { clientTypes } from '@kbn/connector-specs/server';
import { McpError, McpErrorCode, McpNotConnectedError, StreamableHTTPError } from '@kbn/mcp-client';
import {
  createRetryableError,
  createTaskRunError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';

export const MAX_IN_FLIGHT_PER_KEY = 10;
export const BREAKER_FAILURE_THRESHOLD = 3;
export const BREAKER_BASE_COOLING_MS = 60 * 1000;
export const BREAKER_MAX_COOLING_MS = 10 * 60 * 1000;
export const BREAKER_STATE_MAX_SIZE = 1000;
export const BREAKER_STATE_TTL_MS = 2 * BREAKER_MAX_COOLING_MS;

export interface ExecutionGuardOptions {
  maxInFlight?: number;
  failureThreshold?: number;
  baseCoolingMs?: number;
  maxCoolingMs?: number;
  now?: () => number;
}

export interface GuardedRun {
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

const isConnectionFailureShape = (current: unknown): boolean => {
  if (current instanceof McpError) {
    return (
      current.code === McpErrorCode.RequestTimeout || current.code === McpErrorCode.ConnectionClosed
    );
  }
  if (current instanceof McpNotConnectedError) {
    return true;
  }
  if (current instanceof StreamableHTTPError) {
    return typeof current.code === 'number' && current.code >= 500;
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

/** True for connection-level failures. User errors and tool errors return false. */
export const isConnectionFailure = (err: unknown): boolean => {
  if (clientTypes.mcp.isUserError?.(err)) {
    return false;
  }
  if (isRecord(err) && connectFailures.has(err)) {
    return true;
  }
  if (clientTypes.mcp.shouldInvalidateOnError?.(err)) {
    return true;
  }
  return matchesErrorOrCause(err, isConnectionFailureShape);
};

/** Limits concurrent MCP operations per lease key and opens a breaker after connection failures. */
export class McpExecutionGuard {
  private readonly maxInFlight: number;
  private readonly failureThreshold: number;
  private readonly baseCoolingMs: number;
  private readonly maxCoolingMs: number;
  private readonly now: () => number;
  private readonly inFlight = new Map<string, number>();
  private readonly breakers: LRUCache<string, BreakerEntry>;

  constructor(options: ExecutionGuardOptions = {}) {
    this.maxInFlight = options.maxInFlight ?? MAX_IN_FLIGHT_PER_KEY;
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

  async run<T>(ctx: GuardedRun, fn: () => Promise<T>): Promise<T> {
    this.admit(ctx);

    const current = this.inFlight.get(ctx.key) ?? 0;
    if (current >= this.maxInFlight) {
      const message = `Too many in-flight requests to MCP server for connector "${ctx.connectorId}": ${current} already in flight (limit ${this.maxInFlight})`;
      ctx.logger.debug(message);
      throw this.createGuardError(message);
    }

    this.inFlight.set(ctx.key, current + 1);
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
    } finally {
      this.releaseInFlight(ctx.key);
    }
  }

  getInFlight(key: string): number {
    return this.inFlight.get(key) ?? 0;
  }

  getBreakerState(key: string): 'closed' | 'open' | 'half-open' {
    const entry = this.breakers.get(key);
    if (entry?.openUntil === undefined) {
      return 'closed';
    }
    if (entry.probing || this.now() >= entry.openUntil) {
      return 'half-open';
    }
    return 'open';
  }

  clear(): void {
    this.inFlight.clear();
    this.breakers.clear();
  }

  private admit(ctx: GuardedRun): void {
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

  private recordSuccess(ctx: GuardedRun): void {
    const entry = this.breakers.get(ctx.key);
    if (entry === undefined) {
      return;
    }
    this.breakers.delete(ctx.key);
    if (entry.openUntil !== undefined || entry.probing) {
      ctx.logger.warn(`MCP server for connector "${ctx.connectorId}" is available again`);
    }
  }

  private recordFailure(ctx: GuardedRun): void {
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

  private releaseInFlight(key: string): void {
    const next = this.inFlight.get(key);
    // clear() may have dropped the entry while this call was still running.
    if (next === undefined) {
      return;
    }
    if (next <= 1) {
      this.inFlight.delete(key);
    } else {
      this.inFlight.set(key, next - 1);
    }
  }

  private secondsUntil(openUntil: number): number {
    return Math.ceil(Math.max(0, openUntil - this.now()) / 1000);
  }

  private throwUnavailable(ctx: GuardedRun, openUntil: number): never {
    const message = `MCP server for connector "${
      ctx.connectorId
    }" is unavailable, next attempt in ${this.secondsUntil(openUntil)}s`;
    ctx.logger.debug(message);
    throw this.createGuardError(message);
  }

  private createGuardError(message: string): Error {
    return createRetryableError(
      createTaskRunError(new Error(message), TaskErrorSource.FRAMEWORK),
      false
    );
  }
}

export const mcpExecutionGuard = new McpExecutionGuard();
