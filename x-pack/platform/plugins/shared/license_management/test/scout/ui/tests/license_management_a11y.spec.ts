/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// Modals and flyouts render in EUI portals outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

test.describe('License Management — accessibility', { tag: '@local-stateful-classic' }, () => {
  test('license management pages meet a11y requirements', async ({ page, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('management/stack/license_management');
    await page.testSubj.locator('licenseText').waitFor({ state: 'visible' });

    const expectNoA11yViolations = async (exclude?: string[]) => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS, exclude });
      expect(violations).toStrictEqual([]);
    };

    await test.step('overview page', async () => {
      await expectNoA11yViolations();
    });

    await test.step('update license panel', async () => {
      await page.testSubj.click('updateLicenseButton');
      await page.testSubj.locator('cancelUploadButton').waitFor({ state: 'visible' });
      await expectNoA11yViolations();
    });

    await test.step('upload license error panel', async () => {
      await page.testSubj.click('uploadLicenseButton');
      await page.locator('[role="alert"]').waitFor({ state: 'visible' });
      await expectNoA11yViolations();
    });

    await test.step('revert to basic confirmation modal', async () => {
      await page.testSubj.click('cancelUploadButton');
      await page.testSubj.click('revertToBasicButton');
      // EuiModalBody renders .euiModalBody__overflow without tabindex="0"
      await expectNoA11yViolations(['.euiModalBody__overflow']);
      await page.testSubj.click('confirmModalCancelButton');
      await page.testSubj.locator('confirmModalCancelButton').waitFor({ state: 'hidden' });
    });
  });
});
