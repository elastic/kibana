/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { mockInferenceEndpoints as mockEndpointsData } from '../fixtures/mock_data/inference_endpoints';
import {
  mockConnectors,
  mockEmptyConnectors,
  unmockConnectors,
  mockInferenceEndpoints,
  unmockInferenceEndpoints,
} from '../fixtures/mocks';

test.describe(
  'Feature Settings',
  { tag: ['@local-stateful-classic', '@local-stateful-search', '@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await mockConnectors(page);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.featureSettings.goto();
    });

    test.afterEach(async ({ page }) => {
      await unmockConnectors(page);
      await unmockInferenceEndpoints(page);
    });

    test('shows empty state when no models are available', async ({ page, pageObjects }) => {
      const { featureSettings } = pageObjects;
      await unmockConnectors(page);
      await mockEmptyConnectors(page);
      await featureSettings.gotoEmptyState();

      await expect(featureSettings.noModelsEmptyPrompt).toBeVisible();
      await expect(featureSettings.addModelsButton).toBeVisible();
    });

    test('displays page header', async ({ pageObjects }) => {
      await expect(pageObjects.featureSettings.pageHeader).toBeVisible();
    });

    test('renders default model section and controls', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('verify header controls', async () => {
        await expect(featureSettings.saveButton).toBeVisible();
        await expect(featureSettings.saveButton).toBeDisabled();
        await expect(featureSettings.apiDocumentationLink).toBeVisible();
      });

      await test.step('verify default model section', async () => {
        await expect(featureSettings.defaultModelSection).toBeVisible();
        await expect(featureSettings.defaultModelComboBox).toBeVisible();
        await expect(featureSettings.disallowOtherModelsCheckbox).toBeVisible();
      });
    });

    test('toggling disallow other models hides and restores feature sections', async ({
      pageObjects,
    }) => {
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

    test('renders feature sections with sub-feature cards and endpoint rows', async ({
      pageObjects,
    }) => {
      const { featureSettings } = pageObjects;

      await test.step('at least one feature section is visible', async () => {
        await expect(featureSettings.allFeatureSections).not.toHaveCount(0);
      });

      await test.step('sub-feature cards are present with endpoint rows', async () => {
        await expect(featureSettings.allSubFeatureCards).not.toHaveCount(0);
        await expect(featureSettings.allEndpointRows).not.toHaveCount(0);
      });

      await test.step('fixture endpoint row has a default badge', async () => {
        await expect(
          featureSettings.endpointRow('.anthropic-claude-3.7-sonnet-chat_completion')
        ).toContainText('Default');
      });
    });

    test('renders fixture sub-feature cards', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('first fixture sub-feature card is visible', async () => {
        await expect(featureSettings.subFeatureCard('test_feature_alpha')).toBeVisible();
      });

      await test.step('second fixture sub-feature card is visible', async () => {
        await expect(featureSettings.subFeatureCard('test_feature_beta')).toBeVisible();
      });
    });

    test('opens add model popover with search input', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('click add model button and verify search is visible', async () => {
        await featureSettings.addModelButton('test_feature_alpha').click();
        await expect(featureSettings.addModelSearch).toBeVisible();
      });
    });

    test('cancelling reset to defaults modal preserves state', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('open reset to defaults modal', async () => {
        await featureSettings.resetLink('Test Inference').click();
        await expect(featureSettings.resetDefaultsModal).toBeVisible();
      });

      await test.step('cancel closes modal without changes', async () => {
        await featureSettings.resetDefaultsCancelButton.click();
        await expect(featureSettings.resetDefaultsModal).toBeHidden();
        await expect(featureSettings.saveButton).toBeDisabled();
      });
    });

    test('cancelling copy to modal closes without changes', async ({ pageObjects }) => {
      const { featureSettings } = pageObjects;

      await test.step('open copy to modal', async () => {
        await featureSettings.copyToButton('test_feature_alpha').click();
        await expect(featureSettings.copyToModalApply).toBeVisible();
        await expect(featureSettings.copyToModalApply).toBeDisabled();
      });

      await test.step('cancel closes the modal', async () => {
        await featureSettings.copyToModalCancel.click();
        await expect(featureSettings.copyToModalApply).toBeHidden();
      });
    });

    test('searching in add model popover filters the results', async ({ page, pageObjects }) => {
      const { featureSettings } = pageObjects;
      await mockInferenceEndpoints(page, mockEndpointsData);
      await featureSettings.goto();

      await test.step('open popover and verify models are listed', async () => {
        await featureSettings.addModelButton('test_feature_alpha').click();
        await expect(featureSettings.addModelSearch).toBeVisible();
        await expect(featureSettings.addModelOptions).not.toHaveCount(0);
      });

      await test.step('typing a search term reduces the list', async () => {
        const countBeforeSearch = await featureSettings.addModelOptions.count();
        await featureSettings.addModelSearch.fill('anthropic');
        await expect(featureSettings.addModelOptions).not.toHaveCount(countBeforeSearch);
        await expect(featureSettings.addModelOptions).not.toHaveCount(0);
      });
    });

    test('selecting a model from the popover adds it to the endpoint list', async ({
      page,
      pageObjects,
    }) => {
      const { featureSettings } = pageObjects;
      await mockInferenceEndpoints(page, mockEndpointsData);
      await featureSettings.goto();

      const alphaRows = featureSettings.endpointRowsFor('test_feature_alpha');
      await expect(alphaRows).not.toHaveCount(0);
      const initialCount = await alphaRows.count();

      await test.step('open popover and select a model', async () => {
        await featureSettings.addModelButton('test_feature_alpha').click();
        await expect(featureSettings.addModelSearch).toBeVisible();
        await featureSettings.addModelOption('anthropic').click();
      });

      await test.step('endpoint row count increases by one', async () => {
        await expect(alphaRows).toHaveCount(initialCount + 1);
      });

      await test.step('save button becomes enabled', async () => {
        await expect(featureSettings.saveButton).toBeEnabled();
      });
    });

    test('copy to applies source endpoint list to the target sub-feature', async ({
      page,
      pageObjects,
    }) => {
      const { featureSettings } = pageObjects;
      await mockInferenceEndpoints(page, mockEndpointsData);
      await featureSettings.goto();

      const betaCard = featureSettings.subFeatureCard('test_feature_beta');

      await test.step('target sub-feature shows its original endpoint', async () => {
        await expect(betaCard).toContainText('openai');
        await expect(betaCard).not.toContainText('anthropic');
      });

      await test.step('open copy to modal from source sub-feature', async () => {
        await featureSettings.copyToButton('test_feature_alpha').click();
        await expect(featureSettings.copyToModalApply).toBeVisible();
        await expect(featureSettings.copyToModalApply).toBeDisabled();
      });

      await test.step('select target sub-feature', async () => {
        await featureSettings.copyToModalCheckbox('test_feature_beta').click();
      });

      await test.step('apply copies endpoints to target', async () => {
        await expect(featureSettings.copyToModalApply).toBeEnabled();
        await featureSettings.copyToModalApply.click();
        await expect(featureSettings.copyToModalApply).toBeHidden();
      });

      await test.step('target sub-feature now contains source endpoint', async () => {
        await expect(betaCard).toContainText('anthropic');
      });

      await test.step('save button becomes enabled', async () => {
        await expect(featureSettings.saveButton).toBeEnabled();
      });
    });
  }
);
