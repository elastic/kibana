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

// Smoke test that the server-side space-entry redirect actually lands in the
// real app. The exhaustive `next`/default-route normalization cases live in the
// API spec (`api/tests/enter_space_routing.spec.ts`); here we only verify the
// end-to-end navigation. Tagged stateful-classic because it relies on the full
// classic navigation chrome.
const RUN_ID = randomUUID().slice(0, 8);
const SPACE_ID = `enter-nav-${RUN_ID}`;
// A stable, always-present default route (avoids depending on the Canvas app,
// which is not available on every deployment).
const DEFAULT_ROUTE = '/app/management/kibana/objects';

test.describe('Enter space navigation', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices, kbnClient }) => {
    await apiServices.spaces.create({ id: SPACE_ID, name: `${SPACE_ID} name` });
    await kbnClient.uiSettings.replace(
      { defaultRoute: DEFAULT_ROUTE, buildNum: 8467, 'dateFormat:tz': 'UTC' },
      { space: SPACE_ID }
    );
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE_ID);
  });

  test('enters a space respecting its default route, then switches back', async ({
    browserAuth,
    kbnUrl,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();

    await test.step('selecting the space lands on its configured default route', async () => {
      await page.goto(kbnUrl.get('/spaces/space_selector'));
      await pageObjects.spaces.waitForSpaceSelector();
      await pageObjects.spaces.clickSpaceCard(SPACE_ID);

      await expect
        .poll(() => pageObjects.spaces.getCurrentUrl())
        .toContain(`/s/${SPACE_ID}${DEFAULT_ROUTE}`);
    });

    await test.step('switching back to the default space lands in the default space', async () => {
      await pageObjects.spaces.openSpacesNav();
      await pageObjects.spaces.switchToSpaceFromNav('default');

      await expect.poll(() => pageObjects.spaces.getCurrentUrl()).not.toContain('/s/');
    });
  });
});
