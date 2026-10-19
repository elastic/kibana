/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RingBuffer } from './ring_buffer';

describe('RingBuffer', () => {
  it('returns entries after a cursor in order', () => {
    const ring = new RingBuffer<number>(10);
    [1, 2, 3].forEach((n) => ring.push(n));
    expect(ring.since(1, 100)).toEqual({
      entries: [
        { seq: 2, item: 2 },
        { seq: 3, item: 3 },
      ],
      dropped: 0,
    });
    expect(ring.lastSeq).toBe(3);
  });

  it('reports entries overwritten before the reader caught up', () => {
    const ring = new RingBuffer<number>(3);
    for (let i = 1; i <= 7; i++) ring.push(i);
    const { entries, dropped } = ring.since(0, 100);
    expect(entries.map((e) => e.item)).toEqual([5, 6, 7]);
    expect(dropped).toBe(4);
  });

  it('honours the limit so callers can page', () => {
    const ring = new RingBuffer<number>(100);
    for (let i = 1; i <= 50; i++) ring.push(i);
    const page = ring.since(0, 10);
    expect(page.entries).toHaveLength(10);
    expect(ring.since(page.entries[9].seq, 100).entries[0].item).toBe(11);
  });
});
