/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Rule name validation — Discover flyout', { tag: '@local-stateful-classic' }, () => {
  const SOURCE_INDEX = 'test-discover-rule-validation';

  test.beforeAll(async ({ esClient }) => {
    await esClient.indices.create(
      {
        index: SOURCE_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            message: { type: 'text' },
          },
        },
      },
      { ignore: [400] }
    );
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAlertingV2Editor();
    await pageObjects.ruleForm.gotoDiscover();
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
  });

  test('opens rule form flyout and displays default placeholder name', async ({ pageObjects }) => {
    await pageObjects.ruleForm.switchToEsqlMode();
    await pageObjects.ruleForm.openRulesFlyoutFromDiscover();

    await expect(pageObjects.ruleForm.nameInput).toBeVisible();
    await expect(pageObjects.ruleForm.nameInput).toHaveAttribute('placeholder', 'Untitled rule');
  });

  test('shows validation error when saving flyout with empty default name', async ({
    pageObjects,
  }) => {
    await pageObjects.ruleForm.switchToEsqlMode();
    await pageObjects.ruleForm.openRulesFlyoutFromDiscover();
    await expect(pageObjects.ruleForm.nameInput).toBeVisible();

    await pageObjects.ruleForm.clickFlyoutSave();
    await expect(pageObjects.ruleForm.errorCallout).toBeVisible();
    await expect(pageObjects.ruleForm.errorCallout).toContainText('Name is required');
  });

  test('error callout scrolls into view in flyout on failed submission', async ({
    pageObjects,
  }) => {
    await pageObjects.ruleForm.switchToEsqlMode();
    await pageObjects.ruleForm.openRulesFlyoutFromDiscover();
    await expect(pageObjects.ruleForm.nameInput).toBeVisible();

    await pageObjects.ruleForm.clickFlyoutSave();
    await expect(pageObjects.ruleForm.errorCallout).toBeVisible();
    await expect(pageObjects.ruleForm.errorCallout).toBeInViewport();
  });
});
