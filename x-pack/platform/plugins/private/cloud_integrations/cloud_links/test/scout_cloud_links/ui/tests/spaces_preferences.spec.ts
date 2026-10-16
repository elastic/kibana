/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import {
  getInteractiveUserSettings,
  updateInteractiveUserSettings,
} from '../fixtures/user_profile_test_helpers';

test.describe('Spaces preferences modal', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.home.goto();
  });

  test.afterEach(async ({ apiClient, samlAuth }) => {
    await updateInteractiveUserSettings(apiClient, samlAuth, 'viewer', {
      rememberSelectedSpace: false,
      lastSelectedSpaceId: null,
    });
  });

  test('persists remember last selected space preference when saving', async ({
    pageObjects,
    apiClient,
    samlAuth,
  }) => {
    const { spacesPreferences } = pageObjects;

    await spacesPreferences.open();
    await spacesPreferences.enableRememberLastSpacePreference();
    await spacesPreferences.save();

    await expect
      .poll(async () => {
        const settings = await getInteractiveUserSettings(apiClient, samlAuth, 'viewer');
        return settings?.rememberSelectedSpace;
      })
      .toBe(true);
  });

  test('does not persist when discarding after toggle', async ({
    pageObjects,
    apiClient,
    samlAuth,
  }) => {
    const { spacesPreferences } = pageObjects;

    const settingsBefore = await getInteractiveUserSettings(apiClient, samlAuth, 'viewer');

    await spacesPreferences.open();
    await spacesPreferences.enableRememberLastSpacePreference();
    await spacesPreferences.discard();

    await expect
      .poll(async () => getInteractiveUserSettings(apiClient, samlAuth, 'viewer'))
      .toStrictEqual(settingsBefore);
  });
});
