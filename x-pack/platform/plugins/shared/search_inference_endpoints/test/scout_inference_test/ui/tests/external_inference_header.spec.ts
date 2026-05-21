/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { externalInferenceEndpointsMockData } from '../fixtures/mock_data/external_inference_endpoints';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

test.describe(
  'External Inference - header',
  { tag: ['@local-stateful-classic', '@local-stateful-search', '@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.externalInference.goto();
    });

    test.afterEach(async ({ page }) => {
      await unmockInferenceEndpoints(page);
    });

    test('renders the header with api documentation and add endpoint button', async ({
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await expect(externalInference.pageHeader).toBeVisible();
      await expect(externalInference.apiDocumentationLink).toBeVisible();
      await expect(externalInference.addEndpointHeaderButton).toBeVisible();
    });

    test('opens and closes the add inference flyout from the header', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await test.step('clicking add endpoint opens the flyout', async () => {
        await externalInference.addEndpointHeaderButton.click();
        await expect(externalInference.inferenceFlyout).toBeVisible();
      });

      await test.step('clicking close hides the flyout', async () => {
        await externalInference.inferenceFlyoutCloseButton.click();
        await expect(externalInference.inferenceFlyout).toBeHidden();
      });
    });
  }
);
