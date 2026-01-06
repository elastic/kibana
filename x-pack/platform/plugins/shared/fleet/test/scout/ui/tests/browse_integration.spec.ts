/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

test.describe('Browse integration', { tag: ['@ess'] }, () => {
  test('loads the browse integration page', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();

    const { browseIntegrations } = pageObjects;

    await browseIntegrations.navigateTo();
    //  TODO add an expect
  });

  test('it allow to search for an integration', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();

    const { browseIntegrations } = pageObjects;

    await browseIntegrations.navigateTo();
    await browseIntegrations.searchForIntegration('nginx');

    await browseIntegrations.expectIntegrationCardToBeVisible('nginx');
  });
});
