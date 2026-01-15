/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

test.describe('Browse integration', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'xpack.fleet.experimentalFeatures': { newBrowseIntegrationUx: true },
    });
  });
  test.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'xpack.fleet.experimentalFeatures': { newBrowseIntegrationUx: false },
    });
  });

  test('loads the browse integration page and allow to scroll through it', async ({
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { browseIntegrations } = pageObjects;

    await browseIntegrations.navigateTo();

    await expect(browseIntegrations.getMainColumn()).toBeVisible();

    await browseIntegrations.scrollToIntegration('nginx');
  });

  test('it allow to sort integrations', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { browseIntegrations } = pageObjects;

    await browseIntegrations.navigateTo();
    await expect(browseIntegrations.getMainColumn()).toBeVisible();

    await browseIntegrations.sortIntegrations('z-a');

    await browseIntegrations.expectIntegrationCardToBeVisible('zoom');
  });

  test('it allow to search for an integration', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { browseIntegrations } = pageObjects;

    await browseIntegrations.navigateTo();
    await expect(browseIntegrations.getMainColumn()).toBeVisible();

    await browseIntegrations.searchForIntegration('nginx');

    await browseIntegrations.expectIntegrationCardToBeVisible('nginx');
  });
});
