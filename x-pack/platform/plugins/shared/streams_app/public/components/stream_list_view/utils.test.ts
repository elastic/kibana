/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  asTrees,
  buildStreamRows,
  enrichStream,
  filterCollapsedStreamRows,
  parseDsnsName,
  getBaseDataset,
  buildDsnsName,
  getDsnsAncestors,
  asDsnsTrees,
  getDsnsCollapseAncestors,
  isVirtualDsnsName,
} from './utils';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { Direction } from '@elastic/eui';
import { ms } from '@kbn/test/src/functional_test_runner/lib/mocha/reporter/ms';

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

// ============================================================================
// DSNS (Data Stream Naming Scheme) Hierarchy Tests
// ============================================================================

describe('parseDsnsName', () => {
  it('parses a standard DSNS name', () => {
    expect(parseDsnsName('logs-kubernetes.container_logs-default')).toEqual({
      type: 'logs',
      dataset: 'kubernetes.container_logs',
      namespace: 'default',
    });
  });

  it('parses a DSNS name without dot in dataset', () => {
    expect(parseDsnsName('logs-test-default')).toEqual({
      type: 'logs',
      dataset: 'test',
      namespace: 'default',
    });
  });

  it('handles dataset with hyphens', () => {
    expect(parseDsnsName('metrics-my-complex-dataset-production')).toEqual({
      type: 'metrics',
      dataset: 'my-complex-dataset',
      namespace: 'production',
    });
  });

  it('returns null for invalid names with less than 3 parts', () => {
    expect(parseDsnsName('logs-test')).toBeNull();
    expect(parseDsnsName('logs')).toBeNull();
    expect(parseDsnsName('')).toBeNull();
  });

  it('handles various types', () => {
    expect(parseDsnsName('metrics-system.cpu-default')).toEqual({
      type: 'metrics',
      dataset: 'system.cpu',
      namespace: 'default',
    });
    expect(parseDsnsName('traces-apm.app-production')).toEqual({
      type: 'traces',
      dataset: 'apm.app',
      namespace: 'production',
    });
  });
});

describe('getBaseDataset', () => {
  it('returns base dataset when dot exists', () => {
    expect(getBaseDataset('kubernetes.container_logs')).toBe('kubernetes');
    expect(getBaseDataset('system.cpu')).toBe('system');
    expect(getBaseDataset('apm.app.service')).toBe('apm');
  });

  it('returns null when no dot exists', () => {
    expect(getBaseDataset('test')).toBeNull();
    expect(getBaseDataset('mydata')).toBeNull();
  });

  it('handles edge cases', () => {
    expect(getBaseDataset('.startswithdot')).toBe('');
    expect(getBaseDataset('endswithdot.')).toBe('endswithdot');
  });
});

describe('buildDsnsName', () => {
  it('builds a DSNS name from parts', () => {
    expect(buildDsnsName('logs', 'kubernetes.container_logs', 'default')).toBe(
      'logs-kubernetes.container_logs-default'
    );
  });

  it('builds a DSNS name with wildcard', () => {
    expect(buildDsnsName('logs', 'kubernetes.*', 'default')).toBe('logs-kubernetes.*-default');
    expect(buildDsnsName('logs', 'test', '*')).toBe('logs-test-*');
    expect(buildDsnsName('logs', 'kubernetes.*', '*')).toBe('logs-kubernetes.*-*');
  });
});

describe('getDsnsAncestors', () => {
  it('returns sub-dataset parent for stream with dot in dataset', () => {
    const ancestors = getDsnsAncestors('logs-kubernetes.container_logs-default', false);
    expect(ancestors).toEqual(['logs-kubernetes.*-default']);
  });

  it('returns namespace parent when multiple namespaces exist and no dot in dataset', () => {
    const ancestors = getDsnsAncestors('logs-test-default', true);
    expect(ancestors).toEqual(['logs-test-*']);
  });

  it('returns combined and namespace ancestors when both conditions apply', () => {
    const ancestors = getDsnsAncestors('logs-kubernetes.container_logs-default', true);
    expect(ancestors).toEqual(['logs-kubernetes.*-*', 'logs-kubernetes.container_logs-*']);
  });

  it('returns empty array for stream without dot and single namespace', () => {
    const ancestors = getDsnsAncestors('logs-test-default', false);
    expect(ancestors).toEqual([]);
  });

  it('returns empty array for invalid DSNS name', () => {
    const ancestors = getDsnsAncestors('invalid', false);
    expect(ancestors).toEqual([]);
  });
});

describe('getDsnsCollapseAncestors', () => {
  it('returns all possible collapse ancestors', () => {
    const ancestors = getDsnsCollapseAncestors('logs-kubernetes.container_logs-default');
    expect(ancestors).toContain('logs-kubernetes.container_logs-*');
    expect(ancestors).toContain('logs-kubernetes.*-default');
    expect(ancestors).toContain('logs-kubernetes.*-*');
  });

  it('returns namespace ancestor for stream without dot in dataset', () => {
    const ancestors = getDsnsCollapseAncestors('logs-test-default');
    expect(ancestors).toEqual(['logs-test-*']);
  });

  it('returns empty array for invalid name', () => {
    expect(getDsnsCollapseAncestors('invalid')).toEqual([]);
  });
});

describe('isVirtualDsnsName', () => {
  it('returns true for names with wildcard', () => {
    expect(isVirtualDsnsName('logs-kubernetes.*-default')).toBe(true);
    expect(isVirtualDsnsName('logs-test-*')).toBe(true);
    expect(isVirtualDsnsName('logs-kubernetes.*-*')).toBe(true);
  });

  it('returns false for regular names', () => {
    expect(isVirtualDsnsName('logs-kubernetes.container_logs-default')).toBe(false);
    expect(isVirtualDsnsName('logs-test-default')).toBe(false);
  });
});

describe('asDsnsTrees', () => {
  it('does not group single streams', () => {
    const streams = [createStream('logs-test-default', '1d')];
    const trees = asDsnsTrees(streams);
    expect(trees).toHaveLength(1);
    expect(trees[0].stream.name).toBe('logs-test-default');
    expect((trees[0] as any).isVirtual).toBeUndefined();
  });

  it('groups streams with different sub-datasets into type-baseDataset.*-namespace', () => {
    const streams = [
      createStream('logs-kubernetes.container_logs-default', '1d'),
      createStream('logs-kubernetes.events-default', '1d'),
    ];
    const trees = asDsnsTrees(streams);
    expect(trees).toHaveLength(1);
    expect(trees[0].stream.name).toBe('logs-kubernetes.*-default');
    expect((trees[0] as any).isVirtual).toBe(true);
    expect(trees[0].children).toHaveLength(2);
    expect(trees[0].children.map((c) => c.stream.name).sort()).toEqual([
      'logs-kubernetes.container_logs-default',
      'logs-kubernetes.events-default',
    ]);
  });

  it('groups streams with different namespaces into type-dataset-*', () => {
    const streams = [
      createStream('logs-test-default', '1d'),
      createStream('logs-test-production', '1d'),
    ];
    const trees = asDsnsTrees(streams);
    expect(trees).toHaveLength(1);
    expect(trees[0].stream.name).toBe('logs-test-*');
    expect((trees[0] as any).isVirtual).toBe(true);
    expect(trees[0].children).toHaveLength(2);
  });

  it('creates complex hierarchy for multiple sub-datasets and namespaces', () => {
    const streams = [
      createStream('logs-kubernetes.container_logs-default', '1d'),
      createStream('logs-kubernetes.container_logs-production', '1d'),
      createStream('logs-kubernetes.events-default', '1d'),
      createStream('logs-kubernetes.events-production', '1d'),
    ];
    const trees = asDsnsTrees(streams);
    expect(trees).toHaveLength(1);

    const topParent = trees[0];
    expect(topParent.stream.name).toBe('logs-kubernetes.*-*');
    expect((topParent as any).isVirtual).toBe(true);
    expect(topParent.children).toHaveLength(2);

    // Check sub-dataset parents
    const subDatasetParents = topParent.children.map((c) => c.stream.name).sort();
    expect(subDatasetParents).toEqual([
      'logs-kubernetes.container_logs-*',
      'logs-kubernetes.events-*',
    ]);

    // Each sub-dataset parent should have 2 children (namespaces)
    for (const subParent of topParent.children) {
      expect((subParent as any).isVirtual).toBe(true);
      expect(subParent.children).toHaveLength(2);
    }
  });

  it('does not group streams with different base datasets', () => {
    const streams = [
      createStream('logs-kubernetes.container_logs-default', '1d'),
      createStream('logs-system.cpu-default', '1d'),
    ];
    const trees = asDsnsTrees(streams);
    // Each should be in its own group (but still creating virtual parents if needed)
    expect(trees).toHaveLength(2);
    // Single streams don't create virtual parents
    expect(trees.map((t) => t.stream.name).sort()).toEqual([
      'logs-kubernetes.container_logs-default',
      'logs-system.cpu-default',
    ]);
  });

  it('does not create hierarchy for streams without dot in dataset and same namespace', () => {
    const streams = [
      createStream('logs-abc-default', '1d'),
      createStream('logs-def-default', '1d'),
    ];
    const trees = asDsnsTrees(streams);
    // These should NOT be grouped together (different base datasets)
    expect(trees).toHaveLength(2);
    expect(trees.map((t) => t.stream.name).sort()).toEqual([
      'logs-abc-default',
      'logs-def-default',
    ]);
  });

  it('handles mixed hierarchical and non-hierarchical streams', () => {
    const streams = [
      createStream('logs-kubernetes.container_logs-default', '1d'),
      createStream('logs-kubernetes.events-default', '1d'),
      createStream('logs-simple-default', '1d'),
    ];
    const trees = asDsnsTrees(streams);
    expect(trees).toHaveLength(2);

    const names = trees.map((t) => t.stream.name).sort();
    expect(names).toContain('logs-kubernetes.*-default');
    expect(names).toContain('logs-simple-default');
  });

  it('handles streams with sub-dataset having single namespace and single entry', () => {
    // In complex hierarchy case, if a sub-dataset only has one stream, it goes directly under top parent
    const streams = [
      createStream('logs-kubernetes.container_logs-default', '1d'),
      createStream('logs-kubernetes.container_logs-production', '1d'),
      createStream('logs-kubernetes.events-default', '1d'), // Only one namespace for events
    ];
    const trees = asDsnsTrees(streams);
    expect(trees).toHaveLength(1);

    const topParent = trees[0];
    expect(topParent.stream.name).toBe('logs-kubernetes.*-*');
    expect(topParent.children).toHaveLength(2);

    // container_logs should have a namespace parent
    const containerLogsParent = topParent.children.find(
      (c) => c.stream.name === 'logs-kubernetes.container_logs-*'
    );
    expect(containerLogsParent).toBeDefined();
    expect(containerLogsParent!.children).toHaveLength(2);

    // events has only one entry, so it's added directly
    const eventsChild = topParent.children.find(
      (c) => c.stream.name === 'logs-kubernetes.events-default'
    );
    expect(eventsChild).toBeDefined();
  });
});

describe('enrichStream with DSNS virtual streams', () => {
  it('preserves isVirtual flag when enriching', () => {
    const virtualTree = {
      stream: { name: 'logs-kubernetes.*-default' } as any,
      effective_lifecycle: {} as any,
      data_stream: undefined,
      children: [],
      isVirtual: true,
    };
    const enriched = enrichStream(virtualTree);
    expect(enriched.isVirtual).toBe(true);
  });

  it('does not set isVirtual for regular streams', () => {
    const regularTree = {
      stream: { name: 'logs-kubernetes.container_logs-default' } as any,
      effective_lifecycle: {} as any,
      data_stream: undefined,
      children: [],
    };
    const enriched = enrichStream(regularTree);
    expect(enriched.isVirtual).toBeUndefined();
  });
});
