/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isSafePathSegment(seg: string): boolean {
  // Prevent prototype pollution / weird access. Keep this strict.
  return /^[A-Za-z0-9_]+$/.test(seg);
}

function getByDotPath(obj: unknown, dotPath: string): unknown {
  const segments = dotPath.split('.').filter(Boolean);
  let cur: unknown = obj;

  for (const seg of segments) {
    if (!isSafePathSegment(seg)) return undefined;
    if (!isRecord(cur)) return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, seg)) return undefined;
    cur = (cur as UnknownRecord)[seg];
  }

  return cur;
}

/**
 * Extracts an OAuth access token from a provider-specific response body.
 *
 * By default, providers return a top-level `access_token`. Some providers (e.g. Slack OAuth v2)
 * may return additional tokens nested in the response (e.g. `authed_user.access_token`).
 *
 * `tokenExtractor` can be:
 * - undefined: uses `access_token`
 * - a known extractor key (e.g. `slackUserToken`)
 * - a dot-path into the response (e.g. `authed_user.access_token`)
 */
export function extractOAuthAccessToken(
  responseBody: unknown,
  tokenExtractor?: string
): string | undefined {
  if (!tokenExtractor) {
    const v = getByDotPath(responseBody, 'access_token');
    return typeof v === 'string' ? v : undefined;
  }

  // Known provider extractors (kept explicit so specs can stay stable even if provider payload shifts)
  if (tokenExtractor === 'slackUserToken') {
    const v = getByDotPath(responseBody, 'authed_user.access_token');
    return typeof v === 'string' ? v : undefined;
  }

  // Generic dot-path extractor
  const v = getByDotPath(responseBody, tokenExtractor);
  return typeof v === 'string' ? v : undefined;
}

