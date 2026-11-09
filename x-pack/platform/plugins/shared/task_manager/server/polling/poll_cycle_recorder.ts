/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type PollCycleTrigger = 'interval' | 'nudge';

export interface PollCycleRecord {
  started_at: number;
  finished_at: number;
  trigger: PollCycleTrigger;
  poll_interval_ms: number;
  capacity_available: number;
  skipped_no_capacity: boolean;
  tasks_claimed?: number;
}

const DEFAULT_SIZE = 50_000;

/** In-memory ring buffer of recent poll cycles (perf builds only). */
export class PollCycleRecorder {
  private readonly buffer: PollCycleRecord[] = [];
  private next = 0;

  constructor(private readonly size: number = DEFAULT_SIZE) {}

  public record(cycle: PollCycleRecord): void {
    if (this.buffer.length < this.size) {
      this.buffer.push(cycle);
      return;
    }
    this.buffer[this.next] = cycle;
    this.next = (this.next + 1) % this.size;
  }

  public since(sinceMs: number, limit: number): PollCycleRecord[] {
    const ordered =
      this.buffer.length < this.size
        ? this.buffer
        : [...this.buffer.slice(this.next), ...this.buffer.slice(0, this.next)];
    return ordered.filter(({ started_at: startedAt }) => startedAt >= sinceMs).slice(0, limit);
  }
}

export const pollCycleRecorder = new PollCycleRecorder();
