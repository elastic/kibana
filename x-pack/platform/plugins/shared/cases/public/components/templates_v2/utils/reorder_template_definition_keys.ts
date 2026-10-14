/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from 'yaml';
import { isMap, isScalar } from 'yaml';

/**
 * Canonical order of the template definition's top-level keys:
 *  - the case defaults come first, in the same order the render panel presents them (see
 *    `components/template_case_defaults_form.tsx`): name, description, severity, category, tags,
 *    assignees.
 *  - `fields` (the custom fields) is appended last, at the bottom of the document.
 *
 * Any key not listed here (e.g. panel-owned `connector`/`settings` on the merged, saved definition)
 * keeps its existing relative order after these.
 */
export const TEMPLATE_DEFINITION_KEY_ORDER = [
  'name',
  'description',
  'severity',
  'category',
  'tags',
  'assignees',
  'fields',
] as const;

const keyName = (pair: { key: unknown }): string | undefined => {
  const { key } = pair;
  if (key == null) {
    return undefined;
  }
  if (isScalar(key)) {
    return key.value == null ? undefined : String(key.value);
  }
  return String(key);
};

const rankOf = (key: string | undefined): number => {
  const index = TEMPLATE_DEFINITION_KEY_ORDER.indexOf(
    key as (typeof TEMPLATE_DEFINITION_KEY_ORDER)[number]
  );
  return index === -1 ? TEMPLATE_DEFINITION_KEY_ORDER.length : index;
};

/**
 * Reorders the top-level keys of a parsed template definition document into
 * {@link TEMPLATE_DEFINITION_KEY_ORDER}. Comments/formatting travel with their key (each map item
 * is moved as a whole), and the sort is stable so unranked keys keep their relative order.
 *
 * Returns `true` when the order changed (so callers can preserve the author's exact buffer when it
 * was already canonical). No-op for non-map documents.
 */
export const reorderTemplateDefinitionKeys = (doc: Document): boolean => {
  if (!isMap(doc.contents)) {
    return false;
  }

  const root = doc.contents;
  const original = root.items;
  const reordered = original
    .map((pair, index) => ({ pair, index }))
    .sort((a, b) => {
      const byRank = rankOf(keyName(a.pair)) - rankOf(keyName(b.pair));
      return byRank !== 0 ? byRank : a.index - b.index;
    })
    .map(({ pair }) => pair);

  const changed = reordered.some((pair, index) => pair !== original[index]);
  if (changed) {
    root.items = reordered;
  }
  return changed;
};
