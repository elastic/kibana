/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { ListingTable } from '@kbn/content-list-scout';

/**
 * Opens the maps listing page and loads the saved map matching `name`.
 * `mapsAppUrl` should be `kbnUrl.app('maps')` from the calling spec.
 */
export async function loadSavedMap(page: ScoutPage, mapsAppUrl: string, name: string) {
  await page.goto(mapsAppUrl);
  const listingTable = new ListingTable(page);
  await listingTable.waitUntilTableIsLoaded();
  await listingTable.searchFor(name);
  await listingTable.clickItemByName(name);
  await page.testSubj.locator('mapLandingPage').waitFor({ state: 'hidden' });
}
