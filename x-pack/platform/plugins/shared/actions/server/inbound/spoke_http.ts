/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Spoke response headers the public hub will forward. Anything else is fail-closed. */
const SPOKE_HTTP_ALLOWED_HEADERS = new Set(['content-type', 'cache-control']);

/**
 * Allowlists spoke HTTP headers. Unknown names (including `Location` / `Set-Cookie`)
 * fail closed rather than being stripped silently.
 */
export const validateSpokeHttpHeaders = (
  headers: Record<string, string> | undefined
): Record<string, string> | undefined | 'invalid' => {
  if (headers === undefined) {
    return undefined;
  }
  const validated: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.length === 0 || typeof value !== 'string') {
      return 'invalid';
    }
    const name = key.toLowerCase();
    if (!SPOKE_HTTP_ALLOWED_HEADERS.has(name)) {
      return 'invalid';
    }
    validated[name] = value;
  }
  return validated;
};
