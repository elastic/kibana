/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const RUN_ID = randomUUID().slice(0, 8);
// The header search box only appears once the deployment has at least
// SPACE_SEARCH_COUNT_THRESHOLD (8) spaces. Create 8 so this spec is
// self-sufficient in isolation.
const FILLER_TOKEN = `${RUN_ID}filler`;
const UNIQUE_TOKEN = `${RUN_ID}uniquetoken`;
const FILLER_IDS = Array.from({ length: 7 }, (_, i) => `search-${RUN_ID}-${i}`);
const UNIQUE_ID = `search-${RUN_ID}-unique`;

test.describe(
  'Spaces selection: search spaces in popover',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      for (const id of FILLER_IDS) {
        await apiServices.spaces.create({ id, name: `${FILLER_TOKEN} space ${id}` });
      }
      await apiServices.spaces.create({ id: UNIQUE_ID, name: `${UNIQUE_TOKEN} space` });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.spaces.navigateToHome();
    });

    test.afterAll(async ({ apiServices }) => {
      for (const id of [...FILLER_IDS, UNIQUE_ID]) {
        await apiServices.spaces.delete(id);
      }
    });

    test('shows the search box in the spaces popover', async ({ pageObjects }) => {
      await pageObjects.spaces.openSpacesNav();

      await expect(pageObjects.spaces.navSearchInputLocator()).toBeVisible();
    });

    test('finds a single matching space', async ({ pageObjects }) => {
      await pageObjects.spaces.openSpacesNav();
      await pageObjects.spaces.searchSpacesInNav(UNIQUE_TOKEN);

      await expect.poll(async () => await pageObjects.spaces.getNavSpaceResultCount()).toBe(1);
    });

    test('finds no spaces for a non-matching query', async ({ pageObjects }) => {
      await pageObjects.spaces.openSpacesNav();
      await pageObjects.spaces.searchSpacesInNav(`nomatch-${RUN_ID}`);

      await expect.poll(async () => await pageObjects.spaces.getNavSpaceResultCount()).toBe(0);
      expect(await pageObjects.spaces.getNavNoResultsMessage()).toContain('no spaces found');
    });
  }
);
