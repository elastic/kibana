/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

// Mirrors DISCOVER_QUERY_MODE_KEY in src/platform/plugins/shared/discover/common/constants.ts;
// not exported, so duplicated here to avoid a forbidden subpath import.
const DISCOVER_QUERY_MODE_STORAGE_KEY = 'discover.defaultQueryMode';

// Seeded via localStorage because Discover's getInitialAppState reads it
// before the `discover.isEsqlDefault` feature flag.
export async function forceClassicDiscoverMode(page: ScoutPage) {
  await page.addInitScript((key: string) => {
    window.localStorage.setItem(key, 'classic');
  }, DISCOVER_QUERY_MODE_STORAGE_KEY);
}
