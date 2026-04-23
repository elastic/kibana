/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsqueryApiService } from '../../common/services/osquery_api_service';

/**
 * Defensive pre-cleanup helpers. A previous test run that crashed between
 * creating a named resource and running `afterAll` can leave packs / saved
 * queries behind. These helpers are invoked once per environment by the
 * `globalSetupHook` in `parallel_tests/global.setup.ts` — spec-local
 * `beforeAll` SHOULD NOT re-invoke them.
 *
 * Everything here is idempotent — the osquery API service already ignores 404
 * on delete via `ignoreErrors: [404]`, so no extra catch is needed.
 */

interface PackListItem {
  saved_object_id: string;
  name?: string;
}

interface SavedQueryListItem {
  saved_object_id: string;
  id?: string;
}

/**
 * Delete every osquery pack whose name starts with one of the given prefixes.
 * Typical prefixes used by Scout tests: `scout-`, `scout-ra-`, `scout-fast-`,
 * `scout-pack-`, `scout-policy-`, `scout-alert-case-`, `scout-custom-space-`.
 * Pass just the unambiguous test-specific prefix to avoid over-matching.
 */
export async function cleanOsqueryPacksByPrefix(
  osqueryApi: OsqueryApiService,
  prefixes: string[]
): Promise<void> {
  if (prefixes.length === 0) return;
  try {
    const response = await osqueryApi.packs.list();
    const items = (response.data as { data?: PackListItem[] }).data ?? [];
    const targets = items.filter((p) => prefixes.some((prefix) => p.name?.startsWith(prefix)));
    for (const p of targets) {
      await osqueryApi.packs.delete(p.saved_object_id);
    }
  } catch {
    // List call failed (role not yet set up, network error); the ensuing test
    // will either surface the real failure or succeed on a cold state.
  }
}

/**
 * Delete every osquery saved query whose user-facing `id` starts with one of
 * the given prefixes. Prebuilt saved queries (e.g. `users_elastic`) don't match
 * any `scout-` prefix so they are left in place.
 */
export async function cleanOsquerySavedQueriesByPrefix(
  osqueryApi: OsqueryApiService,
  prefixes: string[]
): Promise<void> {
  if (prefixes.length === 0) return;
  try {
    const response = await osqueryApi.savedQueries.list();
    const items = (response.data as { data?: SavedQueryListItem[] }).data ?? [];
    const targets = items.filter((q) => prefixes.some((prefix) => q.id?.startsWith(prefix)));
    for (const q of targets) {
      await osqueryApi.savedQueries.delete(q.saved_object_id);
    }
  } catch {
    // Same rationale as `cleanOsqueryPacksByPrefix`.
  }
}

/** All `scout-*` pack-name prefixes used across the Scout UI suite. Used by the
 *  defensive-cleanup globalSetupHook; if you add a new prefix in a spec, add it
 *  here so the global sweep catches orphans from crashed runs. */
export const ALL_SCOUT_PACK_PREFIXES = [
  'scout-pack-',
  'scout-pack-edit-',
  'scout-pack-delete-',
  'scout-policy-pack-',
  'scout-dup-',
  'scout-ra-',
  'scout-fast-pack-',
  'scout-live-pack-',
  'scout-alert-case-pack-',
  'scout-custom-space-pack-',
  'scout-fleet-int-',
  'scout-osquery-int-',
  'scout-upgrade-',
] as const;

/** All `scout-*` saved-query-id prefixes used across the Scout UI suite. */
export const ALL_SCOUT_SAVED_QUERY_PREFIXES = [
  'scout-pack-sq-',
  'scout-pack-sq-extra-',
  'scout-policy-sq-',
  'scout-sq-create-',
  'scout-sq-edit-',
  'scout-sq-delete-',
  'scout-dropdown-',
] as const;
