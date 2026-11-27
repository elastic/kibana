/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid, TokenKind } from 'liquidjs';
import {
  CUSTOM_CONTENT_LIQUID_OPTIONS,
  CUSTOM_CONTENT_FORBIDDEN_FILTERS,
  CUSTOM_CONTENT_UNESCAPED_TAGS,
} from '@kbn/custom-content-common';

const liquid = new Liquid(CUSTOM_CONTENT_LIQUID_OPTIONS);

// Parsed tags keep a reference to the source token and to the engine that parsed them. Neither is
// part of the template, and walking into the engine would read its internals as if they were one.
const SKIPPED_KEYS: ReadonlySet<string> = new Set(['token', 'liquid']);

interface Forbidden {
  kind: 'filter' | 'tag';
  name: string;
}

/**
 * The first forbidden filter or tag the parsed template uses, or undefined. The tree is walked
 * generically (every `filters` list and every tag, wherever it is: output, assign, capture, loops,
 * the lines of a `liquid` block) so nothing can hide one. The renderer neutralises both too, so this
 * is about telling the author, not the last line of defence.
 */
const findForbidden = (node: unknown, seen = new Set<unknown>()): Forbidden | undefined => {
  if (typeof node !== 'object' || node === null || seen.has(node)) return undefined;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findForbidden(item, seen);
      if (found) return found;
    }
    return undefined;
  }

  const { filters, token, name } = node as {
    filters?: unknown;
    token?: { kind?: unknown };
    name?: unknown;
  };
  // A tag is a node made from a tag token, and its `name` is the tag.
  if (
    token?.kind === TokenKind.Tag &&
    typeof name === 'string' &&
    CUSTOM_CONTENT_UNESCAPED_TAGS.includes(name)
  ) {
    return { kind: 'tag', name };
  }
  if (Array.isArray(filters)) {
    for (const filter of filters) {
      const filterName = (filter as { name?: unknown } | null)?.name;
      if (typeof filterName === 'string' && CUSTOM_CONTENT_FORBIDDEN_FILTERS.includes(filterName)) {
        return { kind: 'filter', name: filterName };
      }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    const found = findForbidden(value, seen);
    if (found) return found;
  }
  return undefined;
};

/** The reason a template does not parse as Liquid or uses a forbidden filter or tag, or undefined when it is fine. */
export const getLiquidSyntaxError = (template: string): string | undefined => {
  try {
    const forbidden = findForbidden(liquid.parse(template.trim()));
    if (!forbidden) return undefined;
    return forbidden.kind === 'filter'
      ? `The "${forbidden.name}" filter is not allowed: values are always HTML-escaped. Remove it.`
      : `The "${forbidden.name}" tag is not allowed in a generated template. Write values with {{ }}, and use CSS (:nth-child) for alternating rows.`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};
