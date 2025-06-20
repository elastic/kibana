/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildStreamRows } from './utils';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { Direction } from '@elastic/eui';

const createStream = (name: string, retention: string | undefined): ListStreamDetail => {
  const lifecycle = retention ? { dsl: { data_retention: retention } } : ({} as any);
  return {
    stream: { name } as any,
    effective_lifecycle: lifecycle as any,
    data_stream: undefined,
  } as unknown as ListStreamDetail;
};

describe('buildStreamRows', () => {
  const rootA = createStream('logs-a', '1d');
  const aChild1 = createStream('logs-a.child1', '8h');
  const aChild2 = createStream('logs-a.child2', '4h');
  const aChild3 = createStream('logs-a.child3', '6h');

  const rootB = createStream('logs-b', '2d');
  const bChild1 = createStream('logs-b.child1', '1h');
  const bChild2 = createStream('logs-b.child2', '3h');
  const bChild3 = createStream('logs-b.child3', '5h');

  const rootC = createStream('metrics-c', '36h');
  const cChild1 = createStream('metrics-c.child1', '2h');
  const cChild2 = createStream('metrics-c.child2', '30m');
  const cChild3 = createStream('metrics-c.child3', '45m');

  const allStreams: ListStreamDetail[] = [
    rootA,
    aChild2,
    aChild1,
    aChild3,
    rootB,
    bChild3,
    bChild1,
    bChild2,
    rootC,
    cChild2,
    cChild3,
    cChild1,
  ];

  it('sorts by name ascending', () => {
    const expected = [
      'logs-a',
      'logs-a.child1',
      'logs-a.child2',
      'logs-a.child3',
      'logs-b',
      'logs-b.child1',
      'logs-b.child2',
      'logs-b.child3',
      'metrics-c',
      'metrics-c.child1',
      'metrics-c.child2',
      'metrics-c.child3',
    ];
    const rows = buildStreamRows(allStreams, 'nameSortKey', 'asc' as Direction);
    expect(rows.map((r) => r.name)).toEqual(expected);
  });

  it('sorts by name descending', () => {
    const expected = [
      'metrics-c',
      'metrics-c.child3',
      'metrics-c.child2',
      'metrics-c.child1',
      'logs-b',
      'logs-b.child3',
      'logs-b.child2',
      'logs-b.child1',
      'logs-a',
      'logs-a.child3',
      'logs-a.child2',
      'logs-a.child1',
    ];
    const rows = buildStreamRows(allStreams, 'nameSortKey', 'desc' as Direction);
    expect(rows.map((r) => r.name)).toEqual(expected);
  });

  it('sorts by retention ascending', () => {
    const expected = [
      'logs-a',
      'logs-a.child2',
      'logs-a.child3',
      'logs-a.child1',
      'metrics-c',
      'metrics-c.child2',
      'metrics-c.child3',
      'metrics-c.child1',
      'logs-b',
      'logs-b.child1',
      'logs-b.child2',
      'logs-b.child3',
    ];
    const rows = buildStreamRows(allStreams, 'retentionMs', 'asc' as Direction);
    expect(rows.map((r) => r.name)).toEqual(expected);
  });

  it('sorts by retention descending', () => {
    const expected = [
      'logs-b',
      'logs-b.child3',
      'logs-b.child2',
      'logs-b.child1',
      'metrics-c',
      'metrics-c.child1',
      'metrics-c.child3',
      'metrics-c.child2',
      'logs-a',
      'logs-a.child1',
      'logs-a.child3',
      'logs-a.child2',
    ];
    const rows = buildStreamRows(allStreams, 'retentionMs', 'desc' as Direction);
    expect(rows.map((r) => r.name)).toEqual(expected);
  });

  it('always lists a child immediately after its parent', () => {
    const rows = buildStreamRows(allStreams, 'nameSortKey', 'asc' as Direction);
    const indexOf = (n: string) => rows.findIndex((r) => r.name === n);
    expect(indexOf('logs-a.child1')).toBeGreaterThan(indexOf('logs-a'));
    expect(indexOf('logs-a.child2')).toBeGreaterThan(indexOf('logs-a'));
    expect(indexOf('logs-a.child3')).toBeGreaterThan(indexOf('logs-a'));
    expect(indexOf('logs-b.child1')).toBeGreaterThan(indexOf('logs-b'));
    expect(indexOf('logs-b.child2')).toBeGreaterThan(indexOf('logs-b'));
    expect(indexOf('logs-b.child3')).toBeGreaterThan(indexOf('logs-b'));
    expect(indexOf('metrics-c.child1')).toBeGreaterThan(indexOf('metrics-c'));
    expect(indexOf('metrics-c.child2')).toBeGreaterThan(indexOf('metrics-c'));
    expect(indexOf('metrics-c.child3')).toBeGreaterThan(indexOf('metrics-c'));
  });
});
