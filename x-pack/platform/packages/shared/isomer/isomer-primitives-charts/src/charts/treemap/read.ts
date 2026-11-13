/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from '../../model/format';
import { formatShare } from '../../model/share';
import type { ChartReading } from '../../render/surfaces';
import { glyph } from '../../theme/glyph';

import { type ResolvedTreemap, resolveTreemap, type TreemapPart } from './model';
import type { TreemapNode } from './schema';

/** Words the text surfaces print, in one place. */
const copy = {
  columns: { path: 'Path', value: 'Value', share: 'Share' },
  allZero: 'Every value is zero.',
  only: (path: string, value: string) => `${path} holds the whole total: ${value}.`,
  largest: (label: string, count: number, value: string, share: string) =>
    `${label} is the largest of ${count} top-level items: ${value}, ${share} of the total.`,
  largestWithin: (label: string, count: number, within: string, value: string, share: string) =>
    `${label} is the largest of ${count} items in ${within}: ${value}, ${share} of the total.`,
};

/** The first level with more than one item, stepping through a lone top-level item and any lone child below it. */
const firstBranching = (
  parts: readonly TreemapPart[],
  roots: readonly number[]
): readonly number[] => {
  let level = roots;
  while (level.length === 1 && parts[level[0]!]!.children.length > 0) {
    level = parts[level[0]!]!.children;
  }
  return level;
};

const printed = ({ printedPath }: TreemapPart): string => printedPath.join(glyph.pathSeparator);

const lead = ({ format }: TreemapNode, { parts, roots, total }: ResolvedTreemap): string => {
  if (total === 0) {
    return copy.allZero;
  }
  const level = firstBranching(parts, roots);
  const value = (part: TreemapPart) => formatValue(part.value, format);
  if (level.length === 1) {
    const only = parts[level[0]!]!;
    return copy.only(printed(only), value(only));
  }
  const top = level
    .map((index) => parts[index]!)
    .reduce((best, part) => (part.value > best.value ? part : best));
  const share = formatShare(top.share);
  const label = top.printedPath.at(-1)!;
  return top.parent === undefined
    ? copy.largest(label, level.length, value(top), share)
    : copy.largestWithin(label, level.length, printed(parts[top.parent]!), value(top), share);
};

/** One row per item, depth-first in authored order, with its share of the whole. */
export const read = (node: TreemapNode): ChartReading => {
  const resolved = resolveTreemap(node);
  const { parts } = resolved;
  return {
    summary: lead(node, resolved),
    table: {
      columns: [copy.columns.path, copy.columns.value, copy.columns.share],
      rows: parts.map((part) => [
        printed(part),
        formatValue(part.value, node.format),
        formatShare(part.share),
      ]),
    },
  };
};
