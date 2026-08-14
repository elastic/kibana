/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpanNode, TraceSpan } from '@kbn/llm-trace-waterfall';

/**
 * Build a deterministic parent-child span tree from a flat list of `TraceSpan`s.
 *
 * The result is used by the "Tree" view of the trace viewer page as a lighter-weight
 * alternative to the waterfall (parent-child structure is explicit, no timing math).
 *
 * Ordering is deterministic:
 * - siblings are sorted by `start_time` ascending, then by `span_id` as a tie-breaker
 *   so identical timestamps still produce a stable order across renders.
 * - a span whose `parent_span_id` is absent, empty, or points to a span not present
 *   in the input is treated as a root (spans can arrive out-of-order or with parents
 *   in a different trace shard).
 */
export const buildSpanTree = (spans: TraceSpan[]): SpanNode[] => {
  const nodes = new Map<string, SpanNode>();
  for (const span of spans) {
    nodes.set(span.span_id, { ...span, children: [], depth: 0 });
  }

  const roots: SpanNode[] = [];
  for (const node of nodes.values()) {
    const parentId = node.parent_span_id;
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortSiblings = (a: SpanNode, b: SpanNode) => {
    const at = new Date(a.start_time).getTime();
    const bt = new Date(b.start_time).getTime();
    if (at !== bt) return at - bt;
    return a.span_id < b.span_id ? -1 : a.span_id > b.span_id ? 1 : 0;
  };

  const assignDepth = (node: SpanNode, depth: number) => {
    node.depth = depth;
    node.children.sort(sortSiblings);
    for (const child of node.children) assignDepth(child, depth + 1);
  };

  roots.sort(sortSiblings);
  for (const root of roots) assignDepth(root, 0);

  return roots;
};

/** Flatten a span tree into a depth-first ordered list for list rendering. */
export const flattenSpanTree = (roots: SpanNode[]): SpanNode[] => {
  const out: SpanNode[] = [];
  const walk = (nodes: SpanNode[]) => {
    for (const node of nodes) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(roots);
  return out;
};
