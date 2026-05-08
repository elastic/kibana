/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

// Mirrors DISCOVER_QUERY_MODE_KEY in
// src/platform/plugins/shared/discover/common/constants.ts.
// That constant is not part of @kbn/discover-plugin's public surface, so it
// is duplicated here to avoid a forbidden subpath import. If Discover
// renames the key, this helper silently falls back to whatever
// `discover.isEsqlDefault` dictates and the affected specs will start
// failing with the original symptoms again — that's the loud signal.
const DISCOVER_QUERY_MODE_STORAGE_KEY = 'discover.defaultQueryMode';

/**
 * Force Discover to start in "Data view" (classic) mode for the next
 * navigation in this `page` context. Discover's `getInitialAppState`
 * reads `localStorage[discover.defaultQueryMode]` before consulting the
 * `discover.isEsqlDefault` feature flag, so seeding it bypasses the flag.
 *
 * Use this in tests that call `pageObjects.discover.selectDataView(...)`
 * or `pageObjects.discover.selectTextBaseLang()` and need a deterministic
 * starting mode regardless of deployment defaults.
 */
export async function forceClassicDiscoverMode(page: ScoutPage) {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, 'classic');
  }, DISCOVER_QUERY_MODE_STORAGE_KEY);
}
