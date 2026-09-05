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

    // Requesting the Kibana root triggers a server 302 into the remembered space's /spaces/enter,
    // which then client-navigates on to the space's app. Resolve `goto` on 'commit' so it settles
    // on that first navigation commit rather than waiting on a 'load' the subsequent hop supersedes
    // (which surfaces as an "interrupted by another navigation" error or a goto timeout). The poll
    // is the terminal readiness gate for the landed redirect.
    await page.goto(kbnUrl.get('/'), { waitUntil: 'commit' });

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
    await expect.poll(() => pageObjects.spaces.getCurrentUrl()).toContain(`/s/${TARGET_SPACE_ID}`);

    await page.goto(kbnUrl.get('/'));

    await pageObjects.spaces.waitForSpaceSelector();
    await expect
      .poll(() => pageObjects.spaces.getCurrentUrl())
      .not.toContain(`/s/${TARGET_SPACE_ID}/app/`);
  });
});
