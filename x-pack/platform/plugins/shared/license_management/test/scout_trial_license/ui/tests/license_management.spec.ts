/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// Serial: every test here needs the trial license that the last one destroys.
test.describe.serial('License Management', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Admin because the app requires the Elasticsearch `manage` cluster privilege.
    await browserAuth.loginAsAdmin();
    await pageObjects.licenseManagement.goto();
  });

  test('shows the active trial license in the page header', async ({ pageObjects }) => {
    const { licenseText, licenseSubText } = pageObjects.licenseManagement;

    await expect(licenseText).toHaveText('Your Trial license is active');
    await expect(licenseSubText).toContainText('Your license will expire on');
  });

  // THIS TEST MUST BE LAST. IT IS DESTRUCTIVE! IT REMOVES THE TRIAL LICENSE!
  test('reverts the trial license to basic', async ({ pageObjects, esClient }) => {
    const { licenseManagement } = pageObjects;
    const { licenseText, confirmModalTitleText } = licenseManagement;

    // Up front so a non-trial cluster fails here, not as a `revertToBasicButton` timeout.
    await expect(licenseText).toHaveText('Your Trial license is active');

    await licenseManagement.openRevertToBasicModal();
    await expect(confirmModalTitleText).toHaveText('Confirm Revert to Basic License');

    await licenseManagement.confirmRevertToBasic();

    // Asserted via Elasticsearch, not the UI: a basic license makes `saml` non-compliant
    // (killing the session `browserAuth` created) and `security tokens` non-compliant (so
    // Kibana cannot issue a replacement), leaving the page unable to load the app.
    await expect
      .poll(async () => (await esClient.license.get()).license.type, { timeout: 30_000 })
      .toBe('basic');
  });
});
