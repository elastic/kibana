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
  navigateToOnboardingStep,
  selectStaticKeysAuth,
  useOnboardingFeatureFlag,
} from '../helpers/onboarding';
import {
  backToServiceSettings,
  continueToDeploy,
  expectDeployDone,
  mockInstalledAwsPackage,
  mockManagedIntegrations,
} from '../helpers/policy_updates';

const SWITCH = 'sharedSettingsDedicatedNamespaceTemplates';

const openAdvancedSettings = async (page: ScoutPage) => {
  await page.testSubj.locator('sharedSettingsAdvancedToggle').click();
  await expect(page.testSubj.locator('sharedSettingsNamespace')).toBeVisible();
};

const deployWithTypedKeys = async (page: ScoutPage) => {
  await continueToDeploy(page);
  await selectStaticKeysAuth(page);
  await page.testSubj.locator('awsStaticKeysForm-accessKeyId').fill('mi1');
  await page.testSubj.locator('awsStaticKeysForm-secretAccessKey').fill('mis1');
  const deployButton = page.testSubj.locator('managedIntegrationsSection-deployButton');
  await expect(deployButton).toBeEnabled();
  await deployButton.click();
  await expectDeployDone(page);
};

test.describe(
  'Onboarding — dedicated index templates for the global namespace (managed integrations)',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    test('is off and disabled until a namespace is set', async ({ browserAuth, page }) => {
      await mockManagedIntegrations(page);
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['elb'],
      });

      await openAdvancedSettings(page);
      await expect(page.testSubj.locator(SWITCH)).toBeDisabled();
      await expect(page.testSubj.locator(SWITCH)).toHaveAttribute('aria-checked', 'false');

      const namespace = page.testSubj.locator('sharedSettingsNamespace').locator('input');
      await namespace.fill('prod');
      await namespace.press('Enter');
      await expect(page.testSubj.locator(SWITCH)).toBeEnabled();
    });

    test('a deploy with the switch on adds the namespace to the installed package', async ({
      browserAuth,
      page,
    }) => {
      await mockManagedIntegrations(page);
      const packageRequests = await mockInstalledAwsPackage(page, ['staging']);
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['elb'],
        namespace: 'prod',
      });

      await openAdvancedSettings(page);
      await page.testSubj.locator(SWITCH).click();
      await expect(page.testSubj.locator(SWITCH)).toHaveAttribute('aria-checked', 'true');
      await deployWithTypedKeys(page);

      await expect.poll(() => packageRequests.updates.length).toBe(1);
      expect(packageRequests.updates[0]).toStrictEqual({
        packageName: 'aws',
        version: '7.1.1',
        body: { namespace_customization_enabled_for: ['staging', 'prod'] },
      });
    });

    test('a deploy with the switch off leaves the package alone', async ({ browserAuth, page }) => {
      await mockManagedIntegrations(page);
      const packageRequests = await mockInstalledAwsPackage(page);
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['elb'],
        namespace: 'prod',
      });

      await deployWithTypedKeys(page);

      expect(packageRequests.updates).toHaveLength(0);
    });

    test('does not update a package that already has the namespace', async ({
      browserAuth,
      page,
    }) => {
      await mockManagedIntegrations(page);
      const packageRequests = await mockInstalledAwsPackage(page, ['prod']);
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['elb'],
        namespace: 'prod',
      });

      await openAdvancedSettings(page);
      await page.testSubj.locator(SWITCH).click();
      await deployWithTypedKeys(page);

      expect(packageRequests.updates).toHaveLength(0);
    });

    test('the switch survives going back to the settings step', async ({ browserAuth, page }) => {
      await mockManagedIntegrations(page);
      await mockInstalledAwsPackage(page);
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['elb'],
        namespace: 'prod',
      });

      await openAdvancedSettings(page);
      await page.testSubj.locator(SWITCH).click();
      await continueToDeploy(page);
      await backToServiceSettings(page);

      await openAdvancedSettings(page);
      await expect(page.testSubj.locator(SWITCH)).toHaveAttribute('aria-checked', 'true');
    });
  }
);
