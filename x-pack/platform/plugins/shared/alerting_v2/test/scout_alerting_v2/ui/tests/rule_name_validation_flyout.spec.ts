/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Rule name validation — Discover flyout', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, esClient }) => {
    await browserAuth.loginAsAdmin();

    await esClient.indices.create(
      {
        index: 'test-discover-rule-validation',
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            message: { type: 'text' },
          },
        },
      },
      { ignore: [400] }
    );

    await pageObjects.ruleForm.gotoDiscover();
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: 'test-discover-rule-validation' }, { ignore: [404] });
  });

  test('opens rule form flyout and displays default placeholder name', async ({ pageObjects }) => {
    await test.step('switch to ES|QL mode', async () => {
      await pageObjects.ruleForm.switchToEsqlMode();
    });

    await test.step('open rule form flyout', async () => {
      await pageObjects.ruleForm.openRulesFlyoutFromDiscover();
    });

    await test.step('verify default placeholder name is shown', async () => {
      await expect(pageObjects.ruleForm.nameInput()).toBeVisible();
      await expect(pageObjects.ruleForm.nameInput()).toHaveAttribute(
        'placeholder',
        'Untitled rule'
      );
    });
  });

  test('shows validation error when saving flyout with empty default name', async ({
    pageObjects,
  }) => {
    await test.step('switch to ES|QL mode and open flyout', async () => {
      await pageObjects.ruleForm.switchToEsqlMode();
      await pageObjects.ruleForm.openRulesFlyoutFromDiscover();
      await expect(pageObjects.ruleForm.nameInput()).toBeVisible();
    });

    await test.step('click save and verify validation error', async () => {
      await pageObjects.ruleForm.clickFlyoutSave();
      const errorCallout = pageObjects.ruleForm.errorCallout();
      await expect(errorCallout).toBeVisible();
      await expect(errorCallout).toContainText('Name is required');
    });
  });

  test('error callout scrolls into view in flyout on failed submission', async ({
    pageObjects,
  }) => {
    await test.step('switch to ES|QL mode and open flyout', async () => {
      await pageObjects.ruleForm.switchToEsqlMode();
      await pageObjects.ruleForm.openRulesFlyoutFromDiscover();
      await expect(pageObjects.ruleForm.nameInput()).toBeVisible();
    });

    await test.step('click save and verify error callout is visible in viewport', async () => {
      await pageObjects.ruleForm.clickFlyoutSave();
      const errorCallout = pageObjects.ruleForm.errorCallout();
      await expect(errorCallout).toBeVisible();
      await expect(errorCallout).toBeInViewport();
    });
  });
});
