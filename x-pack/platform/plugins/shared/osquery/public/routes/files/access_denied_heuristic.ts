/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * macOS paths commonly protected by TCC (Transparency, Consent, and Control) or SIP.
 * Osquery returns zero rows for these paths when the agent process lacks Full Disk Access.
 * This list is intentionally conservative for v1 — an empty result on these paths is
 * treated as likely access-denied rather than a genuinely empty directory.
 */
const LIKELY_PROTECTED_MACOS_PATHS = [
  /^\/Users\/[^/]+\/Library\//,
  /^\/private\/var\//,
  /^\/private\/etc\//,
  /^\/System\/Library\//,
  /^\/Library\/Application Support\//,
];

/**
 * Returns true when an empty result for the given path is more likely due to a
 * permission/TCC denial than a genuinely empty directory. Callers pass this as
 * the `likelyAccessDenied` hint to `classifyFileListing`.
 */
export const isLikelyAccessDenied = (path: string): boolean =>
  LIKELY_PROTECTED_MACOS_PATHS.some((pattern) => pattern.test(path));
