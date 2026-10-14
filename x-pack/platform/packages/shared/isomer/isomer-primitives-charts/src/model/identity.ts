/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { glyph } from '../theme/glyph';

export interface Keyed {
  key?: string | undefined;
  label: string;
}

/** An item's identity: its `key`, else its label. */
export const keyOf = ({ key, label }: Keyed): string => key ?? label;

/** Whether no two items share a key. */
export const keysAreUnique = (items: readonly Keyed[]): boolean =>
  new Set(items.map(keyOf)).size === items.length;

/** Each item's label, followed by its key where another item shares the label, so printed rows stay distinct. */
export const printedLabels = (items: readonly Keyed[]): string[] => {
  const counts = new Map<string, number>();
  for (const { label } of items) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return items.map((item) =>
    counts.get(item.label)! > 1
      ? `${item.label}${glyph.keyOpen}${keyOf(item)}${glyph.keyClose}`
      : item.label
  );
};
