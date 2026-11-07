/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredKi } from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';

// Range filters in external stores only accept numbers, so non-expiring memories get a far-future expiry.
export const NEVER_EXPIRES_MS = Number.MAX_SAFE_INTEGER;

/** Joins sanitized parts into a namespace scoped to one space and AI index. */
export const toMemoryNamespace = ({
  parts,
  separator,
  maxLength,
}: {
  parts: string[];
  separator: string;
  maxLength: number;
}): string =>
  parts
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, '_'))
    .join(separator)
    .slice(0, maxLength);

/** The text external stores embed and search: title, description, and content. */
export const toMemoryText = (document: StoredKi): string =>
  [document.title, document.description, document.content]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('\n\n');

export const parseStoredKi = (raw: unknown): StoredKi =>
  typeof raw === 'string' ? (JSON.parse(raw) as StoredKi) : {};

export const getLifecycleStatus = (document: StoredKi): string =>
  document.governance?.lifecycle?.status ?? 'active';

export const getExpiresAtMs = (document: StoredKi): number =>
  typeof document.expires_at === 'string' ? Date.parse(document.expires_at) : NEVER_EXPIRES_MS;

export const getStringField = (
  record: Record<string, unknown> | null | undefined,
  key: string
): string | undefined => {
  const value = record?.[key];
  return typeof value === 'string' ? value : undefined;
};
