/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsqueryUiApiServicesFixture } from '../fixtures';

/**
 * Defensive pre-cleanup helpers. A previous test run that crashed between
 * creating a named resource and running `afterAll` can leave packs / saved
 * queries behind. Running these in `beforeAll` means the re-run starts from a
 * clean domain slate without requiring the previous run's `afterAll` to have
 * completed.
 *
 * Everything here is idempotent and swallows 404s — safe to call even when
 * there is nothing to clean.
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
  apiServices: OsqueryUiApiServicesFixture,
  prefixes: string[]
): Promise<void> {
  if (prefixes.length === 0) return;
  try {
    const response = await apiServices.osquery.packs.list();
    const items = (response.data as { data?: PackListItem[] }).data ?? [];
    const targets = items.filter((p) => prefixes.some((prefix) => p.name?.startsWith(prefix)));
    for (const p of targets) {
      await apiServices.osquery.packs.delete(p.saved_object_id).catch(() => {});
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
  apiServices: OsqueryUiApiServicesFixture,
  prefixes: string[]
): Promise<void> {
  if (prefixes.length === 0) return;
  try {
    const response = await apiServices.osquery.savedQueries.list();
    const items = (response.data as { data?: SavedQueryListItem[] }).data ?? [];
    const targets = items.filter((q) => prefixes.some((prefix) => q.id?.startsWith(prefix)));
    for (const q of targets) {
      await apiServices.osquery.savedQueries.delete(q.saved_object_id).catch(() => {});
    }
  } catch {
    // Same rationale as `cleanOsqueryPacksByPrefix`.
  }
}
