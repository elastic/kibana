/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyOf, printedLabels } from '../../model/identity';
import { apportion, SHARE_STEPS, sharePercent } from '../../model/share';

import type { TreemapNode } from './schema';
import { walkTree } from './walk';

export interface TreemapPart {
  key: string;
  label: string;
  /** Keys from the top-level item down to this one: the selection target on `path`. */
  keyPath: readonly string[];
  /** Labels along {@link TreemapPart.keyPath}. */
  labelPath: readonly string[];
  /** {@link TreemapPart.labelPath} as surfaces print it, with a key after any label a sibling shares. */
  printedPath: readonly string[];
  /** A leaf's `value`; a parent's children summed. */
  value: number;
  /** Percent of the whole, to one decimal; siblings sum to exactly their parent's share, and top-level items to 100. `null` when the total is zero. */
  share: number | null;
  /** 0 for a top-level item. */
  depth: number;
  /** Index in {@link ResolvedTreemap.parts}; `undefined` for a top-level item. */
  parent: number | undefined;
  /** Indexes in {@link ResolvedTreemap.parts}, in authored order; empty for a leaf. */
  children: readonly number[];
}

/** A treemap with its defaults applied and every value summed, for every surface. */
export interface ResolvedTreemap {
  /** Depth-first in authored order. */
  parts: readonly TreemapPart[];
  /** Indexes of the top-level items in {@link ResolvedTreemap.parts}. */
  roots: readonly number[];
  /** The top-level items summed. */
  total: number;
  layout: 'rectangles' | 'rings';
}

export const resolveTreemap = (node: TreemapNode): ResolvedTreemap => {
  const { nodes } = walkTree(node.items);
  const parts: (TreemapPart & { children: number[] })[] = [];
  const roots: number[] = [];
  nodes.forEach(({ item, parent, depth }, index) => {
    const key = keyOf(item);
    const above = parent === undefined ? undefined : parts[parent]!;
    parts.push({
      key,
      label: item.label,
      keyPath: [...(above?.keyPath ?? []), key],
      labelPath: [...(above?.labelPath ?? []), item.label],
      printedPath: [],
      value: item.children === undefined ? item.value ?? 0 : 0,
      share: null,
      depth,
      parent,
      children: [],
    });
    if (above === undefined) {
      roots.push(index);
    } else {
      above.children.push(index);
    }
  });
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const { parent, value } = parts[index]!;
    if (parent !== undefined) {
      parts[parent]!.value += value;
    }
  }
  const total = roots.reduce((sum, index) => sum + parts[index]!.value, 0);
  const steps = parts.map(() => 0);
  const resolveGroup = (group: readonly number[], whole: number, above: readonly string[]) => {
    const groupParts = group.map((index) => parts[index]!);
    const labels = printedLabels(groupParts);
    const apportioned = apportion(
      groupParts.map(({ value }) => value),
      whole
    );
    group.forEach((index, at) => {
      const part = parts[index]!;
      part.printedPath = [...above, labels[at]!];
      steps[index] = apportioned?.[at] ?? 0;
      part.share = total === 0 ? null : sharePercent(steps[index]);
    });
  };
  resolveGroup(roots, SHARE_STEPS, []);
  for (const [index, { children, printedPath }] of parts.entries()) {
    if (children.length > 0) {
      resolveGroup(children, steps[index]!, printedPath);
    }
  }
  return {
    parts,
    roots,
    total,
    layout: node.layout ?? 'rectangles',
  };
};
