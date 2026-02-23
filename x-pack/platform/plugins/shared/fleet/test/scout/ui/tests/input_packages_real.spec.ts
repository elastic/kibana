/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import {
  setupFleetServer,
  installTestPackageFromZip,
  uninstallTestPackage,
  createAgentPolicy,
  cleanupAgentPolicies,
} from '../common/api_helpers';
import {
  ADD_INTEGRATION_POLICY_BTN,
  POLICY_EDITOR,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
} from '../common/selectors';

const INPUT_TEST_PACKAGE = 'input_package-1.0.0';

test.describe('Input packages real', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ kbnClient, esClient }) => {
    await setupFleetServer(kbnClient, esClient);
    try {
      await installTestPackageFromZip(kbnClient, INPUT_TEST_PACKAGE);
    } catch {
      test.skip(
        true,
        `Test package ${INPUT_TEST_PACKAGE}.zip not found - run from Fleet Cypress env`
      );
    }
    await createAgentPolicy(kbnClient, 'Test input package policy', {
      id: 'test-input-package-policy',
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ kbnClient }) => {
    try {
      await cleanupAgentPolicies(kbnClient);
      await uninstallTestPackage(kbnClient, INPUT_TEST_PACKAGE);
    } catch {
      // Ignore
    }
  });

  test('should create package policy for input package', async ({ page }) => {
    test.skip(true, 'Requires input_package-1.0.0.zip from Fleet Cypress packages');

    await page.goto(`/app/integrations/detail/${INPUT_TEST_PACKAGE}/overview`);
    await page.testSubj.locator(ADD_INTEGRATION_POLICY_BTN).click();
    await page.testSubj.locator(POLICY_EDITOR.POLICY_NAME_INPUT).fill('input-package-policy');
    await page.testSubj
      .locator('multiTextInput-paths')
      .locator('[data-test-subj="multiTextInputRow-0"]')
      .fill('/var/log/test.log');
    await page.testSubj.locator(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  });
});
