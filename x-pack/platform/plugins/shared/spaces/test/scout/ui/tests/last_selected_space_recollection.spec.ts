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
  ensureInteractiveUserSettings,
  updateInteractiveUserSettings,
  waitForLastSelectedSpaceId,
} from '../fixtures/user_profile_test_helpers';

const RUN_ID = randomUUID().slice(0, 8);
const TARGET_SPACE_ID = `remember-${RUN_ID}`;

/**
 * The recollection preference is seeded through the user profile API rather than by
 * switching spaces in the browser: entering a space from the nav starts a full-page
 * navigation that the test cannot observe the end of (the server persists
 * `lastSelectedSpaceId` fire-and-forget while handling `/spaces/enter`, long before the
 * browser has finished loading the space), so a `goto('/')` on top of it races an
 * in-flight navigation. The one test that does drive the switch through the UI asserts
 * against the API and never navigates afterwards.
 */
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

  test('records the last selected space when a space is entered from the nav', async ({
    browserAuth,
    pageObjects,
    apiClient,
    samlAuth,
  }) => {
    await ensureInteractiveUserSettings(apiClient, samlAuth, 'admin', {
      rememberSelectedSpace: true,
      lastSelectedSpaceId: null,
    });
    await browserAuth.loginAsAdmin();

    await pageObjects.spaces.navigateToHome();
    await pageObjects.spaces.openSpacesNav();
    await pageObjects.spaces.switchToSpaceFromNav(TARGET_SPACE_ID);

    await expect
      .poll(() => pageObjects.spaces.getCurrentUrl())
      .toContain(`/s/${TARGET_SPACE_ID}/app/`);
    await waitForLastSelectedSpaceId(apiClient, samlAuth, 'admin', TARGET_SPACE_ID);
  });

  test('redirects to the last selected space when the preference is enabled', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
    apiClient,
    samlAuth,
  }) => {
    await ensureInteractiveUserSettings(apiClient, samlAuth, 'admin', {
      rememberSelectedSpace: true,
      lastSelectedSpaceId: TARGET_SPACE_ID,
    });
    await browserAuth.loginAsAdmin();

    // The Kibana root 302s into the remembered space's `/spaces/enter`, which 302s on to the
    // space's default route — all server-side, so this is a single navigation. Resolve on
    // 'commit' to keep a slow bundle load from exhausting the 20s navigationTimeout; the
    // assertions below are the readiness gate.
    await page.goto(kbnUrl.get('/'), { waitUntil: 'commit' });

    await expect
      .poll(() => pageObjects.spaces.getCurrentUrl())
      .toContain(`/s/${TARGET_SPACE_ID}/app/`);
    // Wait for the space's chrome to actually render before asserting the login-time space
    // selector is absent — on a freshly committed document that assertion is vacuous. The
    // longer timeout absorbs the app bootstrap that 'commit' deliberately doesn't wait for.
    await expect(pageObjects.spaces.spacesSelectorLocator()).toBeVisible({ timeout: 30_000 });
    await expect(pageObjects.spaces.spaceSelectorLocator()).toBeHidden();
  });

  test('shows the space selector when the preference is disabled', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
    apiClient,
    samlAuth,
  }) => {
    await ensureInteractiveUserSettings(apiClient, samlAuth, 'admin', {
      rememberSelectedSpace: false,
      // Deliberately left pointing at the space: the selector must win because the
      // preference is off, not because there is nothing to recollect.
      lastSelectedSpaceId: TARGET_SPACE_ID,
    });
    await browserAuth.loginAsAdmin();

    await page.goto(kbnUrl.get('/'), { waitUntil: 'commit' });

    // Same as above: 'commit' leaves the bootstrap to this assertion, so give it room.
    await expect(pageObjects.spaces.spaceSelectorLocator()).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(() => pageObjects.spaces.getCurrentUrl())
      .not.toContain(`/s/${TARGET_SPACE_ID}/app/`);
  });
});
