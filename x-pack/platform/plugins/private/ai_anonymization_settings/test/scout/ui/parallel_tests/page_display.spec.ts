/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'Anonymization Settings - Page Display',
  {
    // This page is available in every offering, not just Observability, so it
    // is exercised across stateful classic and every serverless project type.
    tag: [...tags.stateful.classic, ...tags.serverless.all],
  },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.anonymizationSettings.navigateTo();
    });

    spaceTest('should display correct UI elements', async ({ pageObjects }) => {
      await spaceTest.step('should display the Anonymization Settings page title', async () => {
        const pageTitle = pageObjects.anonymizationSettings.getPageTitle();
        await expect(pageTitle).toBeVisible();
      });

      await spaceTest.step('should display the header masking-enabled switch', async () => {
        const maskingSwitch = pageObjects.anonymizationSettings.getHeaderMaskingSwitch();
        await expect(maskingSwitch).toBeVisible();
      });

      await spaceTest.step('should display the Tech Preview badge next to the title', async () => {
        const badge = pageObjects.anonymizationSettings.getTechPreviewBadge();
        await expect(badge).toBeVisible();
        await expect(badge).toHaveText('Tech Preview');
      });

      await spaceTest.step('should display the Built-in patterns table by default', async () => {
        const table = pageObjects.anonymizationSettings.getBuiltInPatternsTable();
        await expect(table).toBeVisible();
      });
    });

    spaceTest(
      'should navigate between tabs, showing the corresponding content',
      async ({ pageObjects }) => {
        await spaceTest.step('Custom patterns tab shows the custom patterns table', async () => {
          await pageObjects.anonymizationSettings.goToTab('custom');
          await expect(pageObjects.anonymizationSettings.getCustomPatternsTable()).toBeVisible();
          await expect(pageObjects.anonymizationSettings.getAddPatternButton()).toBeVisible();
        });

        await spaceTest.step('Pattern tester tab shows the test-pattern action', async () => {
          await pageObjects.anonymizationSettings.goToTab('tester');
          await expect(pageObjects.anonymizationSettings.getTestPatternButton()).toBeVisible();
        });

        await spaceTest.step('Settings tab shows masking + on-failure controls', async () => {
          await pageObjects.anonymizationSettings.goToTab('settings');
          await expect(
            pageObjects.anonymizationSettings.getSettingsMaskingEnabledSwitch()
          ).toBeVisible();
          await expect(pageObjects.anonymizationSettings.getOnFailureRadioGroup()).toBeVisible();
        });

        await spaceTest.step(
          'Built-in patterns tab shows the built-in patterns table',
          async () => {
            await pageObjects.anonymizationSettings.goToTab('builtin');
            await expect(pageObjects.anonymizationSettings.getBuiltInPatternsTable()).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'should open the Add pattern flyout from the Custom patterns tab',
      async ({ pageObjects }) => {
        await pageObjects.anonymizationSettings.goToTab('custom');
        await pageObjects.anonymizationSettings.getAddPatternButton().click();

        await expect(pageObjects.anonymizationSettings.getPatternFlyout()).toBeVisible();
      }
    );
  }
);
