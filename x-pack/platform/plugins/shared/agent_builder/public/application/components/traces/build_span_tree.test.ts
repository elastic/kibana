/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceSpan } from '@kbn/llm-trace-waterfall';
import { buildSpanTree, flattenSpanTree } from './build_span_tree';

const span = (overrides: Partial<TraceSpan> & Pick<TraceSpan, 'span_id'>): TraceSpan => ({
  trace_id: 'trace-1',
  name: overrides.name ?? overrides.span_id,
  start_time: '2026-08-13T00:00:00.000Z',
  duration_ms: 10,
  ...overrides,
});

describe('buildSpanTree', () => {
  it('nests children under their parent by parent_span_id', () => {
    const spans: TraceSpan[] = [
      span({ span_id: 'root' }),
      span({ span_id: 'tool', parent_span_id: 'root' }),
      span({ span_id: 'load_skill', parent_span_id: 'tool' }),
    ];

    const roots = buildSpanTree(spans);

    expect(roots).toHaveLength(1);
    expect(roots[0].span_id).toBe('root');
    expect(roots[0].children.map((c) => c.span_id)).toEqual(['tool']);
    expect(roots[0].children[0].children.map((c) => c.span_id)).toEqual(['load_skill']);
  });

  it('assigns depth correctly starting at 0 for roots', () => {
    const spans: TraceSpan[] = [
      span({ span_id: 'root' }),
      span({ span_id: 'child', parent_span_id: 'root' }),
      span({ span_id: 'grandchild', parent_span_id: 'child' }),
    ];

    const roots = buildSpanTree(spans);
    const flat = flattenSpanTree(roots);

    expect(flat.map((s) => [s.span_id, s.depth])).toEqual([
      ['root', 0],
      ['child', 1],
      ['grandchild', 2],
    ]);
  });

  it('sorts siblings by start_time and falls back to span_id for ties', () => {
    const spans: TraceSpan[] = [
      span({ span_id: 'root' }),
      span({
        span_id: 'b',
        parent_span_id: 'root',
        start_time: '2026-08-13T00:00:00.010Z',
      }),
      span({
        span_id: 'a',
        parent_span_id: 'root',
        start_time: '2026-08-13T00:00:00.000Z',
      }),
      span({
        span_id: 'c',
        parent_span_id: 'root',
        start_time: '2026-08-13T00:00:00.000Z',
      }),
    ];

    const roots = buildSpanTree(spans);

    expect(roots[0].children.map((c) => c.span_id)).toEqual(['a', 'c', 'b']);
  });

  it('treats spans with missing parents as roots (out-of-shard parents)', () => {
    const spans: TraceSpan[] = [
      span({ span_id: 'orphan', parent_span_id: 'missing' }),
      span({ span_id: 'root' }),
    ];

    const roots = buildSpanTree(spans);

    expect(roots.map((r) => r.span_id).sort()).toEqual(['orphan', 'root']);
  });

  it('handles the empty input gracefully', () => {
    expect(buildSpanTree([])).toEqual([]);
    expect(flattenSpanTree([])).toEqual([]);
  });
});
