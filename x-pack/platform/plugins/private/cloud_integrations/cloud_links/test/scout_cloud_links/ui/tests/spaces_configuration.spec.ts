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

test.describe('Space configuration modal', { tag: tags.stateful.classic }, () => {
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

  test('renders remember last selected space settings', async ({ page, pageObjects }) => {
    const { spacesConfiguration } = pageObjects;

    await spacesConfiguration.open();

    const modal = page.testSubj.locator('spacesConfigurationModal');
    await expect(modal.getByText('Spaces Configuration')).toBeVisible();
    await expect(modal.getByText('Remember last selected space')).toBeVisible();
    await expect(
      modal.getByText('Kibana will redirect to last accessed space on login.')
    ).toBeVisible();

    await spacesConfiguration.discard();
  });

  test('persists remember last selected space when saving', async ({
    pageObjects,
    apiClient,
    samlAuth,
  }) => {
    const { spacesConfiguration } = pageObjects;

    await spacesConfiguration.open();
    await spacesConfiguration.enableRememberLastSpace();
    await spacesConfiguration.save();

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
    const { spacesConfiguration } = pageObjects;

    const settingsBefore = await getInteractiveUserSettings(apiClient, samlAuth, 'viewer');

    await spacesConfiguration.open();
    await spacesConfiguration.enableRememberLastSpace();
    await spacesConfiguration.discard();

    await expect
      .poll(async () => getInteractiveUserSettings(apiClient, samlAuth, 'viewer'))
      .toStrictEqual(settingsBefore);
  });
});
