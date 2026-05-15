/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { test } from '../fixtures';
import { mockInferenceEndpoints as mockEndpointsData } from '../fixtures/mock_data/inference_endpoints';
import {
  mockConnectors,
  mockEmptyConnectors,
  unmockConnectors,
  mockInferenceEndpoints,
  unmockInferenceEndpoints,
} from '../fixtures/mocks';

test.describe('Feature Settings', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
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

  test('displays page header and the default-model section', async ({ pageObjects }) => {
    const { featureSettings } = pageObjects;

    await expect(featureSettings.pageHeader).toBeVisible();
    await expect(featureSettings.defaultModelSection).toBeVisible();
    await expect(featureSettings.aiCapabilitiesRow).toBeVisible();
    await expect(featureSettings.enableAiSwitch).toBeVisible();
  });

  test('shows only the AI capabilities row when AI is off', async ({ pageObjects }) => {
    const { featureSettings } = pageObjects;

    // Tests start with AI on by default; turn it off.
    await featureSettings.enableAiSwitch.click();

    await expect(featureSettings.aiCapabilitiesRow).toBeVisible();
    await expect(featureSettings.globalModelRow).toBeHidden();
    await expect(featureSettings.featureSpecificModelsRow).toBeHidden();
    await expect(featureSettings.allFeatureSections).toHaveCount(0);
  });

  test('toggling AI on reveals Global model and Feature specific models rows', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    await featureSettings.enableAiSwitch.click();
    await featureSettings.enableAiSwitch.click();

    await expect(featureSettings.globalModelRow).toBeVisible();
    await expect(featureSettings.featureSpecificModelsRow).toBeVisible();
  });

  test('toggling Feature specific models off hides the feature list', async ({ pageObjects }) => {
    const { featureSettings } = pageObjects;

    await test.step('feature sections are visible by default', async () => {
      await expect(featureSettings.allFeatureSections).not.toHaveCount(0);
    });

    await test.step('disabling feature-specific-models hides them', async () => {
      await featureSettings.featureSpecificModelsSwitch.click();
      await expect(featureSettings.allFeatureSections).toHaveCount(0);
    });

    await test.step('re-enabling restores them', async () => {
      await featureSettings.featureSpecificModelsSwitch.click();
      await expect(featureSettings.allFeatureSections).not.toHaveCount(0);
    });
  });

  test('save button is disabled when AI is on, feature-specific models off, and no global model is selected', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    // With feature-specific models on, no global default is valid (scenario 4). Turn FSM off so a
    // global default is required; persisted stack has no global model selected.
    await featureSettings.featureSpecificModelsSwitch.click();

    await expect(featureSettings.saveButton).toBeDisabled();
  });

  test('renders feature sections with sub-feature cards and endpoint rows', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    await expect(featureSettings.allFeatureSections).not.toHaveCount(0);
    await expect(featureSettings.allSubFeatureCards).not.toHaveCount(0);
    await expect(featureSettings.allEndpointRows).not.toHaveCount(0);
    await expect(
      featureSettings.endpointRow('.anthropic-claude-3.7-sonnet-chat_completion')
    ).toBeVisible();
  });

  test('renders fixture sub-feature cards', async ({ pageObjects }) => {
    const { featureSettings } = pageObjects;

    await expect(featureSettings.subFeatureCard('test_feature_alpha')).toBeVisible();
    await expect(featureSettings.subFeatureCard('test_feature_beta')).toBeVisible();
  });

  test('per-sub-feature: turning Use recommended defaults off opens disable modal', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;
    const toggle = featureSettings.useRecommendedDefaultsToggle('test_feature_alpha');

    await expect(toggle).toBeChecked();
    await toggle.click();

    await expect(featureSettings.disableRecommendedModelsModal).toBeVisible();

    await test.step('cancelling keeps the toggle on and the list locked', async () => {
      await featureSettings.disableRecommendedModelsModal
        .getByRole('button', { name: /cancel/i })
        .click();
      await expect(featureSettings.disableRecommendedModelsModal).toBeHidden();
      await expect(toggle).toBeChecked();
      await expect(featureSettings.addModelButton('test_feature_alpha')).toBeHidden();
    });
  });

  test('per-sub-feature: confirming the disable modal unlocks the editable list', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    await featureSettings.disableRecommendedDefaults('test_feature_alpha');

    await expect(
      featureSettings.useRecommendedDefaultsToggle('test_feature_alpha')
    ).not.toBeChecked();
    await expect(featureSettings.addModelButton('test_feature_alpha')).toBeVisible();
  });

  test('per-sub-feature: turning Use recommended defaults back on opens reset modal', async ({
    page,
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;
    await mockInferenceEndpoints(page, mockEndpointsData);
    await featureSettings.goto();

    const toggle = featureSettings.useRecommendedDefaultsToggle('test_feature_alpha');

    await test.step('switch into custom mode and add a non-recommended model', async () => {
      await featureSettings.disableRecommendedDefaults('test_feature_alpha');
      await featureSettings.addModelButton('test_feature_alpha').click();
      await featureSettings.addModelSearch.fill('anthropic');
      await expect(featureSettings.addModelOptions).toHaveCount(1);
      await featureSettings.addModelOptions.click();
    });

    await test.step('toggling back on prompts the reset modal', async () => {
      await toggle.click();
      await expect(featureSettings.resetDefaultsModal).toBeVisible();
    });

    await test.step('confirming the reset locks the list back to recommended', async () => {
      await featureSettings.resetDefaultsConfirm.click();
      await expect(toggle).toBeChecked();
      await expect(featureSettings.addModelButton('test_feature_alpha')).toBeHidden();
    });
  });

  test('opens add model popover with search input when toggle is off', async ({ pageObjects }) => {
    const { featureSettings } = pageObjects;

    await featureSettings.disableRecommendedDefaults('test_feature_alpha');

    await featureSettings.addModelButton('test_feature_alpha').click();
    await expect(featureSettings.addModelSearch).toBeVisible();
  });

  test('searching in add model popover filters the results', async ({ page, pageObjects }) => {
    const { featureSettings } = pageObjects;
    await mockInferenceEndpoints(page, mockEndpointsData);
    await featureSettings.goto();

    await featureSettings.disableRecommendedDefaults('test_feature_alpha');

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

    // Pick a global model first so the form is valid; otherwise Save stays disabled regardless
    // of per-feature changes.
    await featureSettings.selectGlobalModel('Mock Connector');
    await featureSettings.disableRecommendedDefaults('test_feature_alpha');

    const alphaRows = featureSettings.endpointRowsFor('test_feature_alpha');
    const initialCount = await alphaRows.count();

    await test.step('open popover and select a model', async () => {
      await featureSettings.addModelButton('test_feature_alpha').click();
      await expect(featureSettings.addModelSearch).toBeVisible();
      // Narrow before clicking so the substring match resolves to a single option.
      await featureSettings.addModelSearch.fill('anthropic');
      await expect(featureSettings.addModelOptions).toHaveCount(1);
      await featureSettings.addModelOptions.click();
    });

    await test.step('endpoint row count increases by one', async () => {
      await expect(alphaRows).toHaveCount(initialCount + 1);
    });

    await test.step('save button becomes enabled', async () => {
      await expect(featureSettings.saveButton).toBeEnabled();
    });
  });

  test('Copy to copies the assignment to another sub-feature', async ({ page, pageObjects }) => {
    const { featureSettings } = pageObjects;
    await mockInferenceEndpoints(page, mockEndpointsData);
    await featureSettings.goto();

    await featureSettings.selectGlobalModel('Mock Connector');
    await featureSettings.disableRecommendedDefaults('test_feature_alpha');

    const betaCard = featureSettings.subFeatureCard('test_feature_beta');

    await test.step('target sub-feature shows its original endpoint', async () => {
      await expect(betaCard).toContainText('openai');
      await expect(betaCard).not.toContainText('anthropic');
    });

    await test.step('open copy to modal from Copy to button', async () => {
      await featureSettings.copyToButton('test_feature_alpha').click();
      await expect(featureSettings.copyToModalApply).toBeVisible();
      await expect(featureSettings.copyToModalApply).toBeDisabled();
    });

    await test.step('select the target and apply', async () => {
      await featureSettings.copyToModalCheckbox('test_feature_beta').click();
      await expect(featureSettings.copyToModalApply).toBeEnabled();
      await featureSettings.copyToModalApply.click();
      await expect(featureSettings.copyToModalApply).toBeHidden();
    });

    await test.step('target sub-feature now contains the source endpoint', async () => {
      await expect(betaCard).toContainText('anthropic');
    });

    await test.step('save button becomes enabled', async () => {
      await expect(featureSettings.saveButton).toBeEnabled();
    });
  });
});
