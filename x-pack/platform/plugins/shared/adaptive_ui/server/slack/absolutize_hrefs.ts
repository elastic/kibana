/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ViewSpec } from '@kbn/adaptive-ui';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// `//host/path` is protocol-relative and already absolute.
const isKibanaPath = (href: string): boolean => href.startsWith('/') && !href.startsWith('//');

const rewrite = (value: unknown, origin: string): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => rewrite(item, origin));
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === 'href' && typeof child === 'string' && isKibanaPath(child)
        ? `${origin}${child}`
        : rewrite(child, origin),
    ])
  );
};

/**
 * Rewrites root-relative `href`s to absolute URLs against a public Kibana
 * origin. The browser adapter (`@kbn/adaptive-ui/react`) prepends a base path
 * instead, which is right for a page and useless in a Slack message — nothing
 * there resolves a relative URL.
 */
export const absolutizeViewSpecHrefs = (spec: ViewSpec, origin: string): ViewSpec =>
  rewrite(spec, origin) as ViewSpec;
