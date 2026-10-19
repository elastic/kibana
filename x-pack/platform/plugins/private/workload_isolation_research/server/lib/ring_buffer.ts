/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Fixed-capacity ring buffer with monotonically increasing sequence numbers. */
export class RingBuffer<T> {
  private readonly items: Array<{ seq: number; item: T } | undefined>;
  private nextSeq = 1;

  constructor(private readonly capacity: number) {
    this.items = new Array(capacity);
  }

  public push(item: T): number {
    const seq = this.nextSeq++;
    this.items[seq % this.capacity] = { seq, item };
    return seq;
  }

  public get lastSeq(): number {
    return this.nextSeq - 1;
  }

  /** Returns entries with seq > since (oldest first), at most `limit`; reports dropped entries. */
  public since(since: number, limit: number): { entries: Array<{ seq: number; item: T }>; dropped: number } {
    const oldest = Math.max(1, this.nextSeq - this.capacity);
    const from = Math.max(since + 1, oldest);
    const dropped = Math.max(0, oldest - (since + 1));
    const entries: Array<{ seq: number; item: T }> = [];
    for (let seq = from; seq < this.nextSeq && entries.length < limit; seq++) {
      const entry = this.items[seq % this.capacity];
      if (entry && entry.seq === seq) entries.push(entry);
    }
    return { entries, dropped };
  }
}
