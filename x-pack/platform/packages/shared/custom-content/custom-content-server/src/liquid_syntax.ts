/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid } from 'liquidjs';
import {
  CUSTOM_CONTENT_LIQUID_OPTIONS,
  CUSTOM_CONTENT_FORBIDDEN_FILTERS,
} from '@kbn/custom-content-common';

const liquid = new Liquid(CUSTOM_CONTENT_LIQUID_OPTIONS);

/**
 * The name of the first forbidden filter the parsed template applies, or undefined. The tree is
 * walked generically (every `filters` list, whatever tag holds it: output, assign, capture, loops)
 * so a new tag cannot hide one. The renderer neutralises the filters too, so this is about telling
 * the author, not the last line of defence.
 */
const findForbiddenFilter = (node: unknown, seen = new Set<unknown>()): string | undefined => {
  if (typeof node !== 'object' || node === null || seen.has(node)) return undefined;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findForbiddenFilter(item, seen);
      if (found) return found;
    }
    return undefined;
  }

  const { filters, token, ...rest } = node as { filters?: unknown; token?: unknown };
  if (Array.isArray(filters)) {
    for (const filter of filters) {
      const name = (filter as { name?: unknown } | null)?.name;
      if (typeof name === 'string' && CUSTOM_CONTENT_FORBIDDEN_FILTERS.includes(name)) return name;
    }
  }
  for (const value of Object.values(rest)) {
    const found = findForbiddenFilter(value, seen);
    if (found) return found;
  }
  return undefined;
};

/** The reason a template does not parse as Liquid or uses a forbidden filter, or undefined when it is fine. */
export const getLiquidSyntaxError = (template: string): string | undefined => {
  try {
    const forbidden = findForbiddenFilter(liquid.parse(template.trim()));
    return forbidden
      ? `The "${forbidden}" filter is not allowed: values are always HTML-escaped. Remove it.`
      : undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};
