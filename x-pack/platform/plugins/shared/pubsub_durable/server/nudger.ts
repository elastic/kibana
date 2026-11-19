/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { NUDGE_MIN_INTERVAL_MS, NUDGE_RETRY_DELAY_MS } from './constants';

interface RunSoonResult {
  conflict?: boolean;
}

export interface NudgerDeps {
  runSoon: (taskId: string, options: { requestImmediateClaim: boolean }) => Promise<RunSoonResult>;
  isAlreadyRunningError: (error: unknown) => boolean;
  logger: Logger;
  now?: () => number;
}

/**
 * Asks Task Manager to run a drain task now. At most one request per task per second on this node;
 * a request inside that window is delayed to its end rather than dropped. A request that finds the
 * task running or conflicting is retried once after two seconds, so an event that arrives during a
 * run is still picked up promptly.
 */
export class Nudger {
  private readonly lastSentAt = new Map<string, number>();
  private readonly trailing = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private stopped = false;

  constructor(private readonly deps: NudgerDeps) {}

  public nudge(taskId: string): void {
    if (this.stopped || this.trailing.has(taskId)) return;

    const now = (this.deps.now ?? Date.now)();
    const wait = (this.lastSentAt.get(taskId) ?? -Infinity) + NUDGE_MIN_INTERVAL_MS - now;
    if (wait <= 0) {
      this.send(taskId, true);
      return;
    }

    const timer = setTimeout(() => {
      this.trailing.delete(taskId);
      this.timers.delete(timer);
      this.send(taskId, true);
    }, wait);
    this.trailing.set(taskId, timer);
    this.timers.add(timer);
  }

  public stop(): void {
    this.stopped = true;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.trailing.clear();
  }

  private send(taskId: string, mayRetry: boolean): void {
    this.lastSentAt.set(taskId, (this.deps.now ?? Date.now)());
    this.deps
      .runSoon(taskId, { requestImmediateClaim: true })
      .then(({ conflict }) => {
        if (conflict) this.retryOnce(taskId, mayRetry);
      })
      .catch((error: unknown) => {
        if (this.deps.isAlreadyRunningError(error)) {
          this.retryOnce(taskId, mayRetry);
          return;
        }
        const detail = error instanceof Error ? error.message : String(error);
        this.deps.logger.debug(`Could not nudge ${taskId}: ${detail}`);
      });
  }

  private retryOnce(taskId: string, mayRetry: boolean): void {
    if (!mayRetry || this.stopped) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.send(taskId, false);
    }, NUDGE_RETRY_DELAY_MS);
    this.timers.add(timer);
  }
}
