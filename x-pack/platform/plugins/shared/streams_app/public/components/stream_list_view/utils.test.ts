/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asTrees, buildStreamRows, enrichStream, filterCollapsedStreamRows } from './utils';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { Direction } from '@elastic/eui';
import { ms } from '@kbn/test/src/functional_test_runner/lib/mocha/reporter/ms';

const createStream = (name: string, retention: string | undefined): ListStreamDetail => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lifecycle = retention ? { dsl: { data_retention: retention } } : ({} as any);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stream: { name } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const allStreams = asTrees([
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
  ]).map(enrichStream);

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
    const rows = buildStreamRows(allStreams, 'nameSortKey', 'asc' as Direction, {});
    expect(rows.map((r) => r.stream.name)).toEqual(expected);
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
    const rows = buildStreamRows(allStreams, 'nameSortKey', 'desc' as Direction, {});
    expect(rows.map((r) => r.stream.name)).toEqual(expected);
  });

  it('sorts by retention ascending', () => {
    const expected = [
      'logs-a (1.0d)',
      'logs-a.child2 (4.0h)',
      'logs-a.child3 (6.0h)',
      'logs-a.child1 (8.0h)',
      'metrics-c (1.0d)',
      'metrics-c.child2 (30.0m)',
      'metrics-c.child3 (45.0m)',
      'metrics-c.child1 (2.0h)',
      'logs-b (2.0d)',
      'logs-b.child1 (1.0h)',
      'logs-b.child2 (3.0h)',
      'logs-b.child3 (5.0h)',
    ];
    const rows = buildStreamRows(allStreams, 'retentionMs', 'asc' as Direction, {});
    expect(rows.map((r) => `${r.stream.name} (${ms(r.retentionMs)})`)).toEqual(expected);
  });

  it('sorts by retention descending', () => {
    const expected = [
      'logs-b (2.0d)',
      'logs-b.child3 (5.0h)',
      'logs-b.child2 (3.0h)',
      'logs-b.child1 (1.0h)',
      'metrics-c (1.0d)',
      'metrics-c.child1 (2.0h)',
      'metrics-c.child3 (45.0m)',
      'metrics-c.child2 (30.0m)',
      'logs-a (1.0d)',
      'logs-a.child1 (8.0h)',
      'logs-a.child3 (6.0h)',
      'logs-a.child2 (4.0h)',
    ];
    const rows = buildStreamRows(allStreams, 'retentionMs', 'desc' as Direction, {});
    expect(rows.map((r) => `${r.stream.name} (${ms(r.retentionMs)})`)).toEqual(expected);
  });

  it('always lists a child immediately after its parent', () => {
    const rows = buildStreamRows(allStreams, 'nameSortKey', 'asc' as Direction, {});
    const indexOf = (n: string) => rows.findIndex((r) => r.stream.name === n);
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

describe('filterCollapsedStreamRows', () => {
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

  const allStreams = asTrees([
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
  ]).map(enrichStream);

  const rows = buildStreamRows(allStreams, 'nameSortKey', 'asc' as Direction, {});

  it('returns all rows when no streams are collapsed', () => {
    const collapsed = new Set<string>();
    const filtered = filterCollapsedStreamRows(rows, collapsed, 'nameSortKey');
    expect(filtered.map((r) => r.stream.name)).toEqual(rows.map((r) => r.stream.name));
  });

  it('filters out children of collapsed streams', () => {
    const collapsed = new Set<string>(['logs-a']);
    const filtered = filterCollapsedStreamRows(rows, collapsed, 'nameSortKey');
    // Should include logs-a, but not its children
    expect(filtered.map((r) => r.stream.name)).toEqual([
      'logs-a',
      'logs-b',
      'logs-b.child1',
      'logs-b.child2',
      'logs-b.child3',
      'metrics-c',
      'metrics-c.child1',
      'metrics-c.child2',
      'metrics-c.child3',
    ]);
  });

  it('filters out nested children if ancestor is collapsed', () => {
    const collapsed = new Set<string>(['metrics-c']);
    const filtered = filterCollapsedStreamRows(rows, collapsed, 'nameSortKey');
    expect(filtered.map((r) => r.stream.name)).toEqual([
      'logs-a',
      'logs-a.child1',
      'logs-a.child2',
      'logs-a.child3',
      'logs-b',
      'logs-b.child1',
      'logs-b.child2',
      'logs-b.child3',
      'metrics-c',
    ]);
  });

  it('filters out children of multiple collapsed streams', () => {
    const collapsed = new Set<string>(['logs-a', 'metrics-c']);
    const filtered = filterCollapsedStreamRows(rows, collapsed, 'nameSortKey');
    expect(filtered.map((r) => r.stream.name)).toEqual([
      'logs-a',
      'logs-b',
      'logs-b.child1',
      'logs-b.child2',
      'logs-b.child3',
      'metrics-c',
    ]);
  });

  it('does not filter when shouldComposeTree returns false', () => {
    const collapsed = new Set<string>(['logs-a']);
    const filtered = filterCollapsedStreamRows(rows, collapsed, 'retentionMs');
    // Should return all rows regardless of collapsed streams
    expect(filtered.map((r) => r.stream.name)).toEqual(rows.map((r) => r.stream.name));
  });

  it('filters out grandchildren if parent is collapsed', () => {
    // Add a grandchild for testing
    const grandchild = createStream('logs-a.child1.grandchild', '1h');
    const streamsWithGrandchild = asTrees([
      rootA,
      aChild1,
      grandchild,
      aChild2,
      aChild3,
      rootB,
      bChild1,
      bChild2,
      bChild3,
      rootC,
      cChild1,
      cChild2,
      cChild3,
    ]).map(enrichStream);
    const rowsWithGrandchild = buildStreamRows(
      streamsWithGrandchild,
      'nameSortKey',
      'asc' as Direction,
      {}
    );
    const collapsed = new Set<string>(['logs-a.child1']);
    const filtered = filterCollapsedStreamRows(rowsWithGrandchild, collapsed, 'nameSortKey');
    // Should include logs-a.child1, but not its grandchild
    expect(filtered.map((r) => r.stream.name)).toContain('logs-a.child1');
    expect(filtered.map((r) => r.stream.name)).not.toContain('logs-a.child1.grandchild');
  });
});
