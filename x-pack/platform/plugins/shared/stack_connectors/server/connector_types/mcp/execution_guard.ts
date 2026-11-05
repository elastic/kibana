/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  createRetryableError,
  createTaskRunError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';

export const MAX_IN_FLIGHT_PER_KEY = 10;

export interface ExecutionGuardOptions {
  maxInFlight?: number;
  now?: () => number;
}

export interface GuardedRun {
  key: string;
  connectorId: string;
  logger: Logger;
}

/** Limits concurrent MCP operations per lease key and fails fast when the cap is hit. */
export class McpExecutionGuard {
  private readonly maxInFlight: number;
  private readonly inFlight = new Map<string, number>();

  constructor(options: ExecutionGuardOptions = {}) {
    this.maxInFlight = options.maxInFlight ?? MAX_IN_FLIGHT_PER_KEY;
  }

  async run<T>(ctx: GuardedRun, fn: () => Promise<T>): Promise<T> {
    const current = this.inFlight.get(ctx.key) ?? 0;
    if (current >= this.maxInFlight) {
      const message = `Too many in-flight requests to MCP server for connector "${ctx.connectorId}": ${current} already in flight (limit ${this.maxInFlight})`;
      ctx.logger.debug(message);
      throw this.createGuardError(message);
    }

    this.inFlight.set(ctx.key, current + 1);
    try {
      return await fn();
    } finally {
      this.releaseInFlight(ctx.key);
    }
  }

  getInFlight(key: string): number {
    return this.inFlight.get(key) ?? 0;
  }

  clear(): void {
    this.inFlight.clear();
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

  private createGuardError(message: string): Error {
    return createRetryableError(
      createTaskRunError(new Error(message), TaskErrorSource.FRAMEWORK),
      false
    );
  }
}

export const mcpExecutionGuard = new McpExecutionGuard();
