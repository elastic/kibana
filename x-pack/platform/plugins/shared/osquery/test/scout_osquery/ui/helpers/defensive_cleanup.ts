/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsqueryApiService } from '../../common/services/osquery_api_service';

/** Delete scout-prefixed packs/queries (idempotent); called from global setup only. */

interface PackListItem {
  saved_object_id: string;
  name?: string;
}

interface SavedQueryListItem {
  saved_object_id: string;
  id?: string;
}

/** Delete packs whose `name` starts with any of the prefixes. */
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
    // List can fail early; tests will surface real errors if needed.
  }
}

/** Delete saved queries whose `id` starts with any prefix (prebuilts untouched). */
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
    // ignore list failures
  }
}

/** Pack name prefixes swept by global setup (add new scout prefixes here). */
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

/** Saved-query id prefixes swept by global setup. */
export const ALL_SCOUT_SAVED_QUERY_PREFIXES = [
  'scout-pack-sq-',
  'scout-pack-sq-extra-',
  'scout-policy-sq-',
  'scout-sq-create-',
  'scout-sq-edit-',
  'scout-sq-delete-',
  'scout-dropdown-',
] as const;
