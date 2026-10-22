/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FTR source: x-pack/platform/test/accessibility/apps/group3/upgrade_assistant.ts
//
// The other UI specs in this folder are skipped until deprecations can be injected reliably
// (https://github.com/elastic/kibana/issues/266002). This journey does not depend on any
// deprecation being present, so it stays enabled and carries the page-level a11y checks.

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

// The logs flyout renders in an EUI portal outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

test.describe('Upgrade Assistant pages', { tag: testData.UPGRADE_ASSISTANT_TAGS }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.upgradeAssistant.gotoOverview();
  });

  test('overview, logs flyout and deprecation pages have no a11y violations', async ({
    page,
    pageObjects,
  }) => {
    const { upgradeAssistant } = pageObjects;

    const expectNoA11yViolations = async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    };

    await test.step('overview page', async () => {
      await expect(upgradeAssistant.overview).toBeVisible();
      await expectNoA11yViolations();
    });

    await test.step('deprecation logs flyout', async () => {
      await upgradeAssistant.clickVerifyLoggingButton();
      await expect(upgradeAssistant.logsFlyout).toBeVisible();
      await expectNoA11yViolations();
      await page.keyboard.press('Escape');
      await expect(upgradeAssistant.logsFlyout).toBeHidden();
    });

    await test.step('Elasticsearch deprecations page', async () => {
      await upgradeAssistant.gotoEsDeprecations();
      await expect(
        upgradeAssistant.esDeprecationsTable.or(upgradeAssistant.noDeprecationsPrompt)
      ).toBeVisible();
      await expectNoA11yViolations();
    });

    await test.step('Kibana deprecations page', async () => {
      await upgradeAssistant.gotoKibanaDeprecations();
      await expect(
        upgradeAssistant.kibanaDeprecations.or(upgradeAssistant.noDeprecationsPrompt)
      ).toBeVisible();
      await expectNoA11yViolations();
    });
  });
});
