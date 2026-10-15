/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricCollector, RuleExecutionMetricsSnapshot } from './types';

/**
 * Default per-run {@link MetricCollector}. Owns a single `Map<string, number>`
 * for counter aggregation.
 *
 * - `increment(name, by)` sums into the counter. Non-finite `by` values are
 *   ignored to keep the snapshot arithmetic sound.
 * - `snapshot()` returns the current view without freezing the collector.
 * - `finalize(endedAt?)` freezes the collector, records `endedAt`, and returns
 *   the snapshot. Idempotent: subsequent calls return the same snapshot.
 */
export class MetricCollectorImpl implements MetricCollector {
  readonly #counters = new Map<string, number>();
  #frozenSnapshot: RuleExecutionMetricsSnapshot | undefined;

  public readonly executionId: string;
  public readonly startedAt: Date;
  private _endedAt?: Date;

  constructor({ executionId, startedAt }: { executionId: string; startedAt: Date }) {
    this.executionId = executionId;
    this.startedAt = startedAt;
  }

  public get endedAt(): Date | undefined {
    return this._endedAt;
  }

  public increment(name: string, by: number = 1): void {
    if (this.#frozenSnapshot) return;
    if (!Number.isFinite(by)) return;

    const current = this.#counters.get(name) ?? 0;
    this.#counters.set(name, current + by);
  }

  public snapshot(): RuleExecutionMetricsSnapshot {
    if (this.#frozenSnapshot) return this.#frozenSnapshot;

    const endedAt = this._endedAt ?? new Date();
    return this.#buildSnapshot(endedAt);
  }

  public finalize(endedAt: Date = new Date()): RuleExecutionMetricsSnapshot {
    if (this.#frozenSnapshot) return this.#frozenSnapshot;

    this._endedAt = endedAt;
    this.#frozenSnapshot = this.#buildSnapshot(endedAt);
    return this.#frozenSnapshot;
  }

  #buildSnapshot(endedAt: Date): RuleExecutionMetricsSnapshot {
    const counters: Record<string, number> = {};
    for (const [name, value] of this.#counters) {
      counters[name] = value;
    }

    return Object.freeze({
      executionId: this.executionId,
      startedAt: this.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: Math.max(0, endedAt.getTime() - this.startedAt.getTime()),
      counters: Object.freeze(counters),
    });
  }
}
