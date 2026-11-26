/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Headers that are kept when a redirect leaves the original origin. Everything else is dropped,
 * because connectors send credentials in many differently named headers (Api-Key, X-Routing-Key,
 * user-defined secret headers, ...) and a denylist cannot name them all.
 */
const CROSS_ORIGIN_SAFE_HEADERS: ReadonlySet<string> = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'content-encoding',
  'content-language',
  'content-length',
  'content-type',
  'pragma',
  'user-agent',
]);

const isUpgradeToHttps = (from: URL, to: URL): boolean =>
  from.protocol === 'http:' &&
  to.protocol === 'https:' &&
  from.hostname === to.hostname &&
  from.port === '' &&
  to.port === '';

/**
 * Whether a redirect may keep the request's credentials: same origin, or an http to https upgrade
 * on the same host and default ports. Unparsable URLs count as cross-origin.
 */
export const isSameOriginRedirect = (fromUrl: unknown, toUrl: unknown): boolean => {
  if (typeof fromUrl !== 'string' || typeof toUrl !== 'string') {
    return false;
  }
  try {
    const from = new URL(fromUrl);
    const to = new URL(toUrl);
    return from.origin === to.origin || isUpgradeToHttps(from, to);
  } catch {
    return false;
  }
};

/**
 * Deletes every header that is not safe to send to another origin and returns the removed names.
 */
export const removeCrossOriginUnsafeHeaders = (headers: Record<string, unknown>): string[] => {
  const removed = Object.keys(headers).filter(
    (name) => !CROSS_ORIGIN_SAFE_HEADERS.has(name.toLowerCase())
  );
  for (const name of removed) {
    delete headers[name];
  }
  return removed;
};
