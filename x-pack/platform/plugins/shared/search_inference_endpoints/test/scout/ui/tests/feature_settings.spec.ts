/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { mockInferenceEndpoints } from '../fixtures/mock_data/inference_endpoints';

test.describe(
  'Feature Settings',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.featureSettings.goto();
    });

    test('page header is visible', async ({ pageObjects }) => {
      await expect(pageObjects.featureSettings.pageHeader).toBeVisible();
    });

    test('page loads with default model section and controls', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('header controls are present', async () => {
        await expect(featureSettings.saveButton).toBeVisible();
        await expect(featureSettings.saveButton).toBeDisabled();
        await expect(featureSettings.apiDocumentationLink).toBeVisible();
      });

      await test.step('default model section is visible', async () => {
        await expect(featureSettings.defaultModelSection).toBeVisible();
        await expect(featureSettings.defaultModelComboBox).toBeVisible();
        await expect(featureSettings.disallowOtherModelsCheckbox).toBeVisible();
      });
    });

    test('disallow other models hides feature sections', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('enable disallow other models', async () => {
        await featureSettings.disallowOtherModelsCheckbox.click();
      });

      await test.step('feature sections are hidden', async () => {
        await expect(featureSettings.allFeatureSections).toHaveCount(0);
      });

      await test.step('disable disallow other models', async () => {
        await featureSettings.disallowOtherModelsCheckbox.click();
      });

      await test.step('feature sections reappear', async () => {
        await expect(featureSettings.allFeatureSections).not.toHaveCount(0);
      });
    });

    test('feature sections render with sub-feature cards', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('at least one feature section is visible', async () => {
        await expect(featureSettings.allFeatureSections).not.toHaveCount(0);
      });

      await test.step('sub-feature cards are present with endpoint rows', async () => {
        await expect(featureSettings.allSubFeatureCards).not.toHaveCount(0);
        await expect(featureSettings.allEndpointRows).not.toHaveCount(0);
      });

      await test.step('first endpoint row has a default badge', async () => {
        await expect(featureSettings.firstEndpointRow).toContainText('Default');
      });
    });

    test('add model popover opens with search', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('open add model popover on a sub-feature', async () => {
        await featureSettings.firstAddModelButton.click();
        await expect(featureSettings.addModelSearch).toBeVisible();
      });
    });

    test('reset to defaults modal cancel', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('click reset link opens confirmation modal', async () => {
        await featureSettings.firstResetLink.click();
        await expect(featureSettings.resetDefaultsModal).toBeVisible();
      });

      await test.step('cancel closes the modal without changes', async () => {
        await featureSettings.resetDefaultsCancelButton.click();
        await expect(featureSettings.resetDefaultsModal).toBeHidden();
        await expect(featureSettings.saveButton).toBeDisabled();
      });
    });

    test('copy to modal', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('click copy to opens modal', async () => {
        await featureSettings.firstCopyToButton.click();
        await expect(featureSettings.copyToModalApply).toBeVisible();
        await expect(featureSettings.copyToModalApply).toBeDisabled();
      });

      await test.step('cancel closes the modal', async () => {
        await featureSettings.copyToModalCancel.click();
        await expect(featureSettings.copyToModalApply).toBeHidden();
      });
    });

    test('add model popover search filters results', async ({ page, pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('mock inference endpoints with chat_completion models', async () => {
        await featureSettings.mockInferenceEndpoints(mockInferenceEndpoints);
        await page.reload();
        await featureSettings.goto();
      });

      await test.step('open popover and verify models are listed', async () => {
        await featureSettings.firstAddModelButton.click();
        await expect(featureSettings.addModelSearch).toBeVisible();
        await expect(featureSettings.addModelOptions).not.toHaveCount(0);
      });

      await test.step('search filters the model list', async () => {
        await featureSettings.addModelSearch.fill('anthropic');
        await expect(featureSettings.addModelOptions).toHaveCount(1);
        await expect(featureSettings.addModelOptions).toContainText('anthropic');
      });
    });

    test('selecting a model adds it to the assigned models list', async ({ page, pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('mock inference endpoints', async () => {
        await featureSettings.mockInferenceEndpoints(mockInferenceEndpoints);
        await page.reload();
        await featureSettings.goto();
      });

      await test.step('count existing endpoint rows', async () => {
        await expect(featureSettings.allEndpointRows).not.toHaveCount(0);
      });

      const initialCount = await featureSettings.allEndpointRows.count();

      await test.step('select a model from the popover', async () => {
        await featureSettings.firstAddModelButton.click();
        await expect(featureSettings.addModelSearch).toBeVisible();
        // eslint-disable-next-line playwright/no-nth-methods -- selecting the first available model from the popover list
        await featureSettings.addModelOptions.first().click();
      });

      await test.step('endpoint row count increases', async () => {
        await expect(featureSettings.allEndpointRows).toHaveCount(initialCount + 1);
      });

      await test.step('save button becomes enabled', async () => {
        await expect(featureSettings.saveButton).toBeEnabled();
      });
    });
  }
);
