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
import {
  updateInteractiveUserSettings,
  waitForLastSelectedSpaceId,
} from '../fixtures/user_profile_test_helpers';

const RUN_ID = randomUUID().slice(0, 8);
const TARGET_SPACE_ID = `remember-${RUN_ID}`;

test.describe('last selected space recollection', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await Promise.all([
      apiServices.spaces.create({ id: TARGET_SPACE_ID, name: `${TARGET_SPACE_ID} name` }),
    ]);
  });

  test.afterAll(async ({ apiServices, apiClient, samlAuth }) => {
    await updateInteractiveUserSettings(apiClient, samlAuth, 'admin', {
      rememberSelectedSpace: false,
      lastSelectedSpaceId: null,
    });
    await apiServices.spaces.delete(TARGET_SPACE_ID);
  });

  test('redirects to the last selected space when preference is already enabled', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
    apiClient,
    samlAuth,
  }) => {
    await updateInteractiveUserSettings(apiClient, samlAuth, 'admin', {
      rememberSelectedSpace: true,
      lastSelectedSpaceId: null,
    });
    await browserAuth.loginAsAdmin();

    await pageObjects.spaces.navigateToHome();
    await pageObjects.spaces.openSpacesNav();
    await pageObjects.spaces.switchToSpaceFromNav(TARGET_SPACE_ID);
    await waitForLastSelectedSpaceId(apiClient, samlAuth, 'admin', TARGET_SPACE_ID);

    // page.goto races the root redirect chain into the space (it throws "interrupted by another
    // navigation"), so drive the load from a neutral page and wait on the landed URL + selector.
    // Wait only for domcontentloaded here: the selector page's full 'load' is slow under parallel
    // load, and waitForSpaceSelector is the actual readiness gate.
    await page.goto(kbnUrl.get('/spaces/space_selector'), { waitUntil: 'domcontentloaded' });
    await pageObjects.spaces.waitForSpaceSelector();

    await page.evaluate((url) => {
      window.location.href = url;
    }, kbnUrl.get('/'));

    await expect
      .poll(() => pageObjects.spaces.getCurrentUrl())
      .toContain(`/s/${TARGET_SPACE_ID}/app/`);
    await expect(pageObjects.spaces.spaceSelectorLocator()).toBeHidden();
  });

  test('shows the space selector when remember last space is disabled', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
    apiClient,
    samlAuth,
  }) => {
    await updateInteractiveUserSettings(apiClient, samlAuth, 'admin', {
      rememberSelectedSpace: false,
      lastSelectedSpaceId: null,
    });
    await browserAuth.loginAsAdmin();

    await pageObjects.spaces.navigateToHome();
    await pageObjects.spaces.openSpacesNav();
    await pageObjects.spaces.switchToSpaceFromNav(TARGET_SPACE_ID);

    await page.goto(kbnUrl.get('/'));

    await pageObjects.spaces.waitForSpaceSelector();
    await expect
      .poll(() => pageObjects.spaces.getCurrentUrl())
      .not.toContain(`/s/${TARGET_SPACE_ID}/app/`);
  });
});
