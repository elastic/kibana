/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultType } from './result_type';
import { isEmptyOrAllPlatforms } from './platform';

export interface PackExecutionDefaults {
  /** Pack-level minimum osquery version default. Fans out to inheriting queries. */
  min_osquery_version?: string | null;
  /** Pack-level result type default. Fans out to inheriting queries. */
  result_type?: ResultType | null;
  /**
   * Pack-level platform default (comma-separated osquery platform tokens).
   * Fans out to inheriting queries exactly like the two fields above.
   *
   * This is deliberately NOT osquery's native `Pack.Platform`, which is an
   * init-time gate that skips the *whole pack* when it fails. Kibana never
   * emits that field; this value is expanded onto each inheriting query as a
   * per-query `platform`, so a query's own value always wins and a mismatch
   * only ever skips that one query.
   */
  platform?: string | null;
}

/**
 * Whether a pack query should run. `enabled` defaults to true when absent
 * (legacy queries never stored the field). Shared by the scheduled Fleet
 * emit, the live-query action path, and the response-action form.
 */
export const isPackQueryEnabled = (query: { enabled?: boolean }): boolean =>
  query.enabled !== false;

/**
 * Resolve a query's effective version and platform against pack-level
 * defaults. Per-query wins; an empty-token or all-OS platform is treated as
 * unset so the pack default can apply. The result omits an all-OS platform
 * (emitting it is a no-op on the wire).
 *
 * Lives in `common/` because three call sites share it — the scheduled Fleet
 * emit, the live-query action path, and the response-action form in the
 * browser — so the precedence rule cannot drift between them.
 * `result_type` is intentionally not resolved here — live queries do not
 * send it.
 */
export const resolveEffectiveQueryExecution = (
  query: { version?: string | null; platform?: string | null },
  packExecutionDefaults?: PackExecutionDefaults
): { version?: string; platform?: string } => {
  // Normalize blank/empty version strings — an empty string is not a meaningful
  // override; treat it as absent so the pack default can apply.
  const perQueryVersion = query.version || undefined;
  const effectiveVersion =
    perQueryVersion ?? packExecutionDefaults?.min_osquery_version ?? undefined;

  const perQueryPlatform = isEmptyOrAllPlatforms(query.platform)
    ? undefined
    : query.platform ?? undefined;
  const effectivePlatform = perQueryPlatform ?? packExecutionDefaults?.platform ?? undefined;

  return {
    ...(effectiveVersion ? { version: effectiveVersion } : {}),
    ...(isEmptyOrAllPlatforms(effectivePlatform) ? {} : { platform: effectivePlatform }),
  };
};
