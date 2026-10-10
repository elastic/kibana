/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { useOnboardingFeatureFlag } from '../helpers/onboarding';
import { ACCESS_KEY_REF, SECRET_KEY_REF } from '../helpers/stored_secrets';
import {
  backToServiceSettings,
  continueToDeploy,
  deployElbWithTypedKeys,
  expectDeployDone,
  mockManagedIntegrations,
} from '../helpers/policy_updates';

test.describe(
  'Onboarding — managed integrations add a service to the existing package policy',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    test('after a reload, the added service goes into the first policy with a PUT', async ({
      browserAuth,
      page,
    }) => {
      const requests = await mockManagedIntegrations(page);
      await deployElbWithTypedKeys(browserAuth, page, requests);

      // Resume: the URL carries ?deploymentId=, the typed keys are gone from memory.
      await page.reload();
      await backToServiceSettings(page, ['guardduty']);
      await continueToDeploy(page);
      await expect(page.testSubj.locator('awsStaticKeysForm-accessKeyId-stored')).toBeVisible();
      await page.testSubj.locator('managedIntegrationsSection-deployButton').click();

      await expectDeployDone(page);
      expect(requests.updated).toHaveLength(1);
      expect(requests.created).toHaveLength(1);
      expect(requests.updated[0].policyId).toBe('policy-1');
      expect(requests.updated[0].body.vars.access_key_id).toStrictEqual(ACCESS_KEY_REF);
      expect(requests.updated[0].body.vars.secret_access_key).toStrictEqual(SECRET_KEY_REF);
      // Both services are enabled in the one policy; a disabled stub would not be a deployed service.
      expect(requests.updated[0].body.inputs['elb-aws-s3'].enabled).toBe(true);
      expect(requests.updated[0].body.inputs['guardduty-aws-s3'].enabled).toBe(true);
    });

    test('a failed update marks the deployment failed and Retry updates the same policy', async ({
      browserAuth,
      page,
    }) => {
      const requests = await mockManagedIntegrations(page);
      await deployElbWithTypedKeys(browserAuth, page, requests);

      await backToServiceSettings(page, ['guardduty']);
      await continueToDeploy(page);
      requests.failNextUpdate();
      await page.testSubj.locator('managedIntegrationsSection-deployButton').click();

      await expect(page.testSubj.locator('managedIntegrationsSection-errorCallout')).toBeVisible();
      expect(requests.updated).toHaveLength(1);
      expect(requests.created).toHaveLength(1);

      await page.testSubj.locator('managedIntegrationsSection-retryButton').click();

      await expectDeployDone(page);
      await expect(page.testSubj.locator('managedIntegrationsSection-errorCallout')).toBeHidden();
      expect(requests.updated).toHaveLength(2);
      expect(requests.updated[1].policyId).toBe('policy-1');
      expect(requests.created).toHaveLength(1);
    });

    test('a service with its own namespace gets its own policy', async ({ browserAuth, page }) => {
      const requests = await mockManagedIntegrations(page);
      await deployElbWithTypedKeys(browserAuth, page, requests);

      await backToServiceSettings(page, ['guardduty']);
      await page.testSubj.locator('serviceSettingsStep-editButton-guardduty').click();
      const namespace = page.testSubj.locator('serviceSettings-namespaceField').locator('input');
      await namespace.fill('prod');
      await namespace.press('Enter');
      await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();
      await continueToDeploy(page);
      await page.testSubj.locator('managedIntegrationsSection-deployButton').click();

      await expectDeployDone(page);
      expect(requests.created).toHaveLength(2);
      expect(requests.created[1].namespace).toBe('prod');
      expect(requests.updated).toHaveLength(0);
    });

    test('a duplicated service gets its own policy', async ({ browserAuth, page }) => {
      const requests = await mockManagedIntegrations(page);
      await deployElbWithTypedKeys(browserAuth, page, requests);

      await backToServiceSettings(page);
      await page.testSubj.locator('serviceSettingsStep-actionsButton-elb').click();
      await page.testSubj.locator('serviceSettingsStep-duplicateAction-elb').click();
      await page.testSubj.locator('duplicateServiceModal-nameField').fill('ELB copy');
      await page.testSubj.locator('duplicateServiceModal-addButton').click();
      await continueToDeploy(page);
      await page.testSubj.locator('managedIntegrationsSection-deployButton').click();

      await expectDeployDone(page);
      expect(requests.created).toHaveLength(2);
      expect(requests.updated).toHaveLength(0);
    });
  }
);
