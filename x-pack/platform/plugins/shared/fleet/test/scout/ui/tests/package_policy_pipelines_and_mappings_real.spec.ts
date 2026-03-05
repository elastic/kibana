/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import {
  installTestPackageFromZip,
  uninstallTestPackage,
  createAgentPolicy,
  cleanupAgentPolicies,
} from '../common/api_helpers';
import { POLICY_EDITOR } from '../common/selectors';

const INPUT_TEST_PACKAGE = 'input_package-1.0.0';
const INTEGRATION_TEST_PACKAGE = 'logs_integration-1.0.0';

test.describe('Package policy pipelines and mappings', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should show pipelines and mappings for input package', async ({ page, kbnClient }) => {
    test.skip(true, 'Requires input_package-1.0.0.zip from Fleet Cypress packages');

    try {
      await installTestPackageFromZip(kbnClient, INPUT_TEST_PACKAGE);
    } catch {
      test.skip(true, `Requires ${INPUT_TEST_PACKAGE}.zip`);
    }
    await createAgentPolicy(kbnClient, 'Test input package policy', {
      id: 'test-input-package-policy',
    });

    try {
      await page.goto(`/app/integrations/detail/${INPUT_TEST_PACKAGE}/policies`);
      await expect(page.testSubj.locator(POLICY_EDITOR.INSPECT_PIPELINES_BTN)).toBeVisible();
    } finally {
      await cleanupAgentPolicies(kbnClient);
      await uninstallTestPackage(kbnClient, INPUT_TEST_PACKAGE);
    }
  });

  test('should show pipelines and mappings for integration package', async ({
    page,
    kbnClient,
  }) => {
    test.skip(true, 'Requires logs_integration-1.0.0.zip from Fleet Cypress packages');

    try {
      await installTestPackageFromZip(kbnClient, INTEGRATION_TEST_PACKAGE);
    } catch {
      test.skip(true, `Requires ${INTEGRATION_TEST_PACKAGE}.zip`);
    }

    try {
      await page.goto(`/app/integrations/detail/${INTEGRATION_TEST_PACKAGE}/policies`);
      await expect(page.testSubj.locator(POLICY_EDITOR.INSPECT_PIPELINES_BTN)).toBeVisible();
    } finally {
      await uninstallTestPackage(kbnClient, INTEGRATION_TEST_PACKAGE);
    }
  });
});
