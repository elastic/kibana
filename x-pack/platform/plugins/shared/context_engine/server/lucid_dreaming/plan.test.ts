/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { planLucidBatches } from './plan';

const NOW = Date.parse('2026-11-20T12:00:00.000Z');
const MINUTE = 60 * 1000;

const itemsAt = (...minutesAgo: number[]) =>
  minutesAgo.map((ago, i) => ({ id: `m${i}`, at: new Date(NOW - ago * MINUTE).toISOString() }));

const plan = (items: ReturnType<typeof itemsAt>) =>
  planLucidBatches(items, {
    batchSize: 2,
    maxWaitMs: 2 * MINUTE,
    now: NOW,
    timeOf: ({ at }) => at,
  });

describe('planLucidBatches', () => {
  it('plans nothing without items', () => {
    expect(plan([])).toEqual({ batches: [] });
  });

  it('reports full batches at once', () => {
    const items = itemsAt(0.5, 0.4, 0.3, 0.2);
    expect(plan(items)).toEqual({
      batches: [
        [items[0], items[1]],
        [items[2], items[3]],
      ],
      last: items[3],
    });
  });

  it('holds back a last batch that is not full while it is young, to let it fill', () => {
    const items = itemsAt(0.5, 0.4, 0.3);
    expect(plan(items)).toEqual({ batches: [[items[0], items[1]]], last: items[1] });
  });

  it('reports a last batch that is not full once its oldest item has waited long enough', () => {
    const items = itemsAt(4, 3.5, 3);
    expect(plan(items)).toEqual({
      batches: [[items[0], items[1]], [items[2]]],
      last: items[2],
    });
  });

  it('waits on a lone young item', () => {
    expect(plan(itemsAt(1))).toEqual({ batches: [] });
  });
});
