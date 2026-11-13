/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Input guard on nesting, not a layout limit: each level is two JSON levels (item and `children`), so 16 keeps a
 * treemap well inside the SDK's `MAX_INPUT_DEPTH` of 64 with room for the composition around it.
 */
export const MAX_TREE_DEPTH = 16;

interface Nested<T> {
  children?: readonly T[] | undefined;
}

export interface WalkedItem<T> {
  item: T;
  /** Index in {@link TreeWalk.nodes}; `undefined` for a top-level item. */
  parent: number | undefined;
  /** 0 for a top-level item. */
  depth: number;
  /** Where the item sits in the node, for validation issues. */
  path: (string | number)[];
}

export interface TreeWalk<T> {
  /** Depth-first in authored order, so every parent precedes its children. */
  nodes: readonly WalkedItem<T>[];
  /** Indexes in {@link TreeWalk.nodes} of items whose `children` sit past {@link MAX_TREE_DEPTH}, which the walk does not enter. */
  tooDeep: ReadonlySet<number>;
}

/** Every item of a tree, walked without recursion. */
export const walkTree = <T extends Nested<T>>(items: readonly T[]): TreeWalk<T> => {
  const nodes: WalkedItem<T>[] = [];
  const tooDeep = new Set<number>();
  const stack: WalkedItem<T>[] = items
    .map((item, index) => ({
      item,
      parent: undefined,
      depth: 0,
      path: ['items', index],
    }))
    .reverse();
  while (stack.length > 0) {
    const entry = stack.pop()!;
    const at = nodes.length;
    nodes.push(entry);
    const { children } = entry.item;
    if (children === undefined) {
      continue;
    }
    if (entry.depth + 1 >= MAX_TREE_DEPTH) {
      tooDeep.add(at);
      continue;
    }
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({
        item: children[index]!,
        parent: at,
        depth: entry.depth + 1,
        path: [...entry.path, 'children', index],
      });
    }
  }
  return { nodes, tooDeep };
};
