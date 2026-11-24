/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export const DEFAULT_MAX_IN_FLIGHT_WRITES = 50;
export const DEFAULT_DRAIN_TIMEOUT_MS = 10_000;

export type BackgroundWriteRejectionReason = 'capacity' | 'stopping';

export type TrackBackgroundWriteResult =
  | { accepted: true }
  | { accepted: false; reason: BackgroundWriteRejectionReason };

export interface BackgroundWriteTrackerOptions {
  maxInFlight?: number;
  drainTimeoutMs?: number;
  logger?: Pick<Logger, 'warn'>;
}

/** Bounds concurrent fire-and-forget background writes per Kibana instance and drains them on shutdown. */
export class BackgroundWriteTracker {
  private readonly maxInFlight: number;
  private readonly drainTimeoutMs: number;
  private readonly logger?: Pick<Logger, 'warn'>;
  private readonly inFlight = new Set<Promise<void>>();
  private stopping = false;

  constructor(options: BackgroundWriteTrackerOptions = {}) {
    this.maxInFlight = options.maxInFlight ?? DEFAULT_MAX_IN_FLIGHT_WRITES;
    this.drainTimeoutMs = options.drainTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;
    this.logger = options.logger;
  }

  public get inFlightCount(): number {
    return this.inFlight.size;
  }

  /** Starts `run` if below capacity and not stopping, otherwise rejects synchronously. */
  tryStart(run: () => Promise<void>): TrackBackgroundWriteResult {
    if (this.stopping) {
      return { accepted: false, reason: 'stopping' };
    }
    if (this.inFlight.size >= this.maxInFlight) {
      return { accepted: false, reason: 'capacity' };
    }

    let runPromise: Promise<void>;
    try {
      runPromise = run();
    } catch (error) {
      runPromise = Promise.reject(error);
    }

    const tracked = runPromise.then(
      () => undefined,
      () => undefined
    );
    this.inFlight.add(tracked);
    void tracked.finally(() => {
      this.inFlight.delete(tracked);
    });
    return { accepted: true };
  }

  /** Stops accepting new writes and waits for in-flight writes up to `drainTimeoutMs`. */
  async drain(): Promise<void> {
    this.stopping = true;
    if (this.inFlight.size === 0) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timed_out'>((resolve) => {
      timeoutId = setTimeout(() => resolve('timed_out'), this.drainTimeoutMs);
    });

    try {
      const outcome = await Promise.race([
        Promise.all(this.inFlight).then(() => 'drained' as const),
        timeout,
      ]);
      if (outcome === 'timed_out' && this.inFlight.size > 0) {
        this.logger?.warn(
          `Timed out after ${this.drainTimeoutMs}ms waiting for ${this.inFlight.size} in-flight session memory write(s) to finish`
        );
      }
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }
}
