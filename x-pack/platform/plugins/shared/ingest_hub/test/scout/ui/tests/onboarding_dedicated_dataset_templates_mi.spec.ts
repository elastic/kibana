/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { ScoutPage } from '@kbn/scout';
import { test } from '../fixtures';
import {
  mockPackage,
  navigateToOnboardingStep,
  useOnboardingFeatureFlag,
} from '../helpers/onboarding';
import { MOCK_AWS_CLOUDWATCH_INPUT_OTEL_PACKAGE } from '../helpers/ecf_only_services';
import {
  continueToDeploy,
  expectDeployDone,
  mockManagedIntegrations,
} from '../helpers/policy_updates';

const SWITCH = 'serviceSettingsFlyout-createDatasetTemplatesSwitch';

const openEc2Flyout = async (page: ScoutPage) => {
  await page.testSubj.locator('serviceSettingsStep-serviceLink-ec2_otel').click();
  await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeVisible();
};

const setDataset = async (page: ScoutPage, dataset: string) => {
  const input = page.testSubj.locator('datasetComboBox').getByTestId('comboBoxSearchInput');
  await input.fill(dataset);
  await input.press('Enter');
};

const saveFlyout = async (page: ScoutPage) => {
  await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();
  await expect(page.testSubj.locator('serviceSettingsFlyout')).toBeHidden();
};

const deployWithTypedKeys = async (page: ScoutPage) => {
  await continueToDeploy(page);
  await page.testSubj.locator('awsStaticKeysForm-accessKeyId').fill('mi1');
  await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('mis1');
  const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
  await expect(deployButton).toBeEnabled();
  await deployButton.click();
  await expectDeployDone(page);
};

test.describe(
  'Onboarding — dedicated index template for a custom dataset (managed integrations)',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    test.beforeEach(async ({ browserAuth, page }) => {
      await mockPackage(page, 'aws_cloudwatch_input_otel', MOCK_AWS_CLOUDWATCH_INPUT_OTEL_PACKAGE);
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        dataFormat: 'otel',
        selectedServiceIds: ['ec2_otel'],
      });
    });

    test('turning the switch off sends the opt-out with the deploy', async ({ page }) => {
      const requests = await mockManagedIntegrations(page);
      await openEc2Flyout(page);
      await expect(page.testSubj.locator('datasetComboBox')).toBeVisible();
      await expect(page.testSubj.locator(SWITCH)).toBeHidden();
      await setDataset(page, 'aws.prod');
      await expect(page.testSubj.locator(SWITCH)).toHaveAttribute('aria-checked', 'true');
      await page.testSubj.locator(SWITCH).click();
      await expect(page.testSubj.locator(SWITCH)).toHaveAttribute('aria-checked', 'false');
      await saveFlyout(page);

      await deployWithTypedKeys(page);

      await expect.poll(() => requests.created.length).toBe(1);
      expect(requests.created[0]).toHaveProperty('create_dataset_templates', false);
    });

    test('leaving the switch on leaves the choice to Fleet', async ({ page }) => {
      const requests = await mockManagedIntegrations(page);
      await openEc2Flyout(page);
      await setDataset(page, 'aws.prod');
      await saveFlyout(page);

      await deployWithTypedKeys(page);

      await expect.poll(() => requests.created.length).toBe(1);
      expect(requests.created[0]).not.toHaveProperty('create_dataset_templates');
    });

    test('the choice survives closing and reopening the flyout', async ({ page }) => {
      await mockManagedIntegrations(page);
      await openEc2Flyout(page);
      await setDataset(page, 'aws.prod');
      await page.testSubj.locator(SWITCH).click();
      await saveFlyout(page);

      await openEc2Flyout(page);

      await expect(page.testSubj.locator(SWITCH)).toHaveAttribute('aria-checked', 'false');
    });
  }
);
