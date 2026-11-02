/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const UPGRADE_TRIGGER_DEF_PREFIX_ID = 'productUpgradeInterceptTrigger';
const CONFIGURED_UPGRADE_INTERCEPT_INTERVAL = 7 * 24 * 60 * 60 * 1000;

test.describe('Product intercept for upgrade event', { tag: '@local-stateful-classic' }, () => {
  let interceptUpgradeTriggerDefId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const kibanaVersion = await kbnClient.version.get();
    interceptUpgradeTriggerDefId = `${UPGRADE_TRIGGER_DEF_PREFIX_ID}:${kibanaVersion}`;
  });

  test("displays the upgrade intercept if it's display condition is met", async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('home');

    // Set localStorage to trigger intercept display
    await pageObjects.intercepts.setInterceptTimer(
      interceptUpgradeTriggerDefId,
      CONFIGURED_UPGRADE_INTERCEPT_INTERVAL
    );

    // Refresh the page at this point the configured interval condition will be met
    await page.reload();

    await pageObjects.intercepts.waitForInterceptDisplayed(interceptUpgradeTriggerDefId);

    // Verify the intercept is visible
    const interceptLocator = pageObjects.intercepts.getInterceptLocator(
      interceptUpgradeTriggerDefId
    );
    await expect(interceptLocator).toBeVisible();

    // Dismiss the intercept
    await pageObjects.intercepts.clickDismissButton();
  });
});
