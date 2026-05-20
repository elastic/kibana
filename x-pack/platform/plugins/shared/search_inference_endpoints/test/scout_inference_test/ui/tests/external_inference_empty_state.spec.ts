/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

test.describe(
  'External Inference - empty state',
  { tag: ['@local-stateful-classic', '@local-stateful-search', '@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await mockInferenceEndpoints(page, []);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.externalInference.gotoEmptyState();
    });

    test.afterEach(async ({ page }) => {
      await unmockInferenceEndpoints(page);
    });

    test('renders prompt, add button, and documentation link', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await expect(externalInference.emptyPrompt).toBeVisible();
      await expect(externalInference.emptyPromptAddButton).toBeVisible();
      await expect(externalInference.emptyPromptDocumentationLink).toBeVisible();
    });

    test('opens and closes the add inference flyout from the empty prompt', async ({
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await test.step('clicking add endpoint opens the flyout', async () => {
        await externalInference.emptyPromptAddButton.click();
        await expect(externalInference.inferenceFlyout).toBeVisible();
      });

      await test.step('clicking close hides the flyout', async () => {
        await externalInference.inferenceFlyoutCloseButton.click();
        await expect(externalInference.inferenceFlyout).toBeHidden();
      });
    });
  }
);
