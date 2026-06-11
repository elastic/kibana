/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parse an `extends` ref string (e.g. `"<templateId>"` or `"<templateId>@<version>"`)
 * into its constituent parts.
 *
 * The `@version` suffix is **opt-in**: omitting it means "always resolve the latest
 * version". A malformed suffix (non-positive-integer) is treated as part of the
 * template id rather than silently pinning an unintended version.
 *
 * Template ids are v4 UUIDs and never contain `@`, so `@` is a safe delimiter.
 */
export const parseExtendsRef = (
  ext: string | undefined
): { templateId: string | undefined; version: number | undefined } => {
  if (!ext) {
    return { templateId: undefined, version: undefined };
  }

  const atIndex = ext.lastIndexOf('@');
  if (atIndex === -1) {
    return { templateId: ext, version: undefined };
  }

  const suffix = ext.slice(atIndex + 1);
  const prefix = ext.slice(0, atIndex);

  // Only treat the suffix as a version if the prefix is non-empty and the
  // suffix is a positive integer string. Anything else (including `@3` with
  // an empty prefix) is treated as part of the id (robust fallback).
  if (prefix.length > 0 && /^\d+$/.test(suffix)) {
    const n = Number(suffix);
    if (n > 0) {
      return { templateId: prefix, version: n };
    }
  }

  // Malformed suffix — treat the whole string as the id, no version pin.
  return { templateId: ext, version: undefined };
};

/**
 * Format a template id and optional version into an `extends` ref string.
 *
 * When `version` is `undefined` or `null` the bare `templateId` is returned,
 * preserving the "resolve latest" behaviour.
 */
export const formatExtendsRef = (templateId: string, version?: number | null): string =>
  version != null ? `${templateId}@${version}` : templateId;
