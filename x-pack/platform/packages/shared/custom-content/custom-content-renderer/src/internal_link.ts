/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInternalURL } from '@kbn/std';

const getSegmentsAfterSpace = (pathname: string): string[] => {
  const segments = pathname.split('/').slice(1);
  return segments[0] === 's' ? segments.slice(2) : segments;
};

/**
 * Returns a link that is safe to navigate the top window to, or undefined when `href` is not an
 * in-Kibana app path. The result is rebuilt from the parsed URL, never the original string, so
 * dot segments (including `%2e%2e`) and other parser quirks cannot survive into the output.
 */
export const toSafeInternalHref = (href: string, basePath: string): string | undefined => {
  if (!href.startsWith('/') || !isInternalURL(href)) return undefined;
  const { pathname, search, hash } = new URL(href, window.location.origin);
  const [root, appId] = getSegmentsAfterSpace(pathname);
  if (root !== 'app' || !appId) return undefined;
  return `${basePath}${pathname}${search}${hash}`;
};
