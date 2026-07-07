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
import { mockInferenceEndpoints } from '../fixtures/mocks';

test.describe('deprecation surface', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  // Connector IDs the mocked connectors API surfaces for the deprecated/EOL models.
  // Set by endpointsAsConnectors() in fixtures/mocks.ts.
  const deprecatedConnectorId = '.mock-openai-gpt-3.5-chat_completion-g4c7';
  const eolConnectorId = '.mock-openai-davinci-chat_completion-h2d5';

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await mockInferenceEndpoints(page, mockEndpointsData);
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.featureSettings.goto();
  });

  test('renders no callouts when only GA models are assigned', async ({ pageObjects }) => {
    const { featureSettings } = pageObjects;

    await expect(featureSettings.deprecatedModelsCallout).toBeHidden();
    await expect(featureSettings.eolModelsCallout).toBeHidden();
  });

  test('global model combobox suffixes deprecated and EOL options', async ({
    page,
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    // Open the combobox without typing a search term so the option labels render without
    // highlight markup affecting the accessible name.
    await featureSettings.globalModelComboBox.locator('[data-test-subj="comboBoxInput"]').click();

    const listbox = page.getByRole('listbox', { name: /choose from the following options/i });
    await expect(
      listbox.getByRole('option', { name: 'OpenAI GPT-3.5 - Deprecated' })
    ).toBeVisible();
    await expect(
      listbox.getByRole('option', { name: 'OpenAI Davinci - End of Life' })
    ).toBeVisible();
  });

  test('selecting an EOL model as the global default shows the danger callout', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    await featureSettings.selectGlobalModel('OpenAI Davinci - End of Life');

    await expect(featureSettings.eolModelsCallout).toBeVisible();
    await expect(featureSettings.eolModelsCallout).toContainText('OpenAI Davinci');
    await expect(featureSettings.deprecatedModelsCallout).toBeHidden();
  });

  test('assigning a deprecated model to a feature shows the warning callout and badge on the row', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    await featureSettings.disableRecommendedDefaults('test_feature_alpha');
    await featureSettings.addModelButton('test_feature_alpha').click();
    await featureSettings.addModelSearch.fill('GPT-3.5');
    await expect(featureSettings.addModelOptions).toHaveCount(1);
    await featureSettings.addModelOptions.click();

    await test.step('warning callout appears with the model name', async () => {
      await expect(featureSettings.deprecatedModelsCallout).toBeVisible();
      await expect(featureSettings.deprecatedModelsCallout).toContainText('OpenAI GPT-3.5');
      await expect(featureSettings.eolModelsCallout).toBeHidden();
    });

    await test.step('assigned endpoint row shows the deprecated badge', async () => {
      await expect(
        featureSettings.modelStatusBadge(deprecatedConnectorId, 'deprecated')
      ).toBeVisible();
    });
  });

  test('add model popover disables the EOL option and renders icon-only status badges', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    await featureSettings.disableRecommendedDefaults('test_feature_alpha');
    await featureSettings.addModelButton('test_feature_alpha').click();
    // Don't fill the search — EuiSelectable's filter highlight wraps matched substrings in
    // accessible-name markup, which interferes with role/name queries.

    const deprecatedOption = featureSettings.addModelOptions.filter({
      hasText: 'OpenAI GPT-3.5',
    });
    const eolOption = featureSettings.addModelOptions.filter({ hasText: 'OpenAI Davinci' });

    await expect(deprecatedOption).toBeVisible();
    await expect(eolOption).toBeVisible();

    await test.step('the EOL option is aria-disabled and the deprecated option is not', async () => {
      await expect(eolOption).toHaveAttribute('aria-disabled', 'true');
      await expect(deprecatedOption).not.toHaveAttribute('aria-disabled', 'true');
    });

    await test.step('both deprecated and EOL options render an icon-only status badge', async () => {
      await expect(
        featureSettings.modelStatusBadge(deprecatedConnectorId, 'deprecated')
      ).toBeVisible();
      await expect(featureSettings.modelStatusBadge(eolConnectorId, 'eol')).toBeVisible();
    });
  });

  test('global-default locked row renders the deprecation badge', async ({ pageObjects }) => {
    const { featureSettings } = pageObjects;

    await featureSettings.selectGlobalModel('OpenAI GPT-3.5 - Deprecated');

    // test_feature_alpha is registered by the fixture plugin and has no saved settings, so the
    // locked global-default row should render and carry the badge. Every feature without saved
    // settings will render its own locked row; scope to the fixture feature to avoid matching
    // the global default row on unrelated features.
    const lockedRow = featureSettings.globalDefaultLockedRow('test_feature_alpha');
    await expect(lockedRow).toBeVisible();
    await expect(
      lockedRow.locator(`[data-test-subj="modelDeprecatedBadge-${deprecatedConnectorId}"]`)
    ).toBeVisible();
  });

  test('callouts are hidden when Feature specific models is off', async ({ pageObjects }) => {
    const { featureSettings } = pageObjects;

    await featureSettings.disableRecommendedDefaults('test_feature_alpha');
    await featureSettings.addModelButton('test_feature_alpha').click();
    await featureSettings.addModelSearch.fill('GPT-3.5');
    await featureSettings.addModelOptions.click();

    await expect(featureSettings.deprecatedModelsCallout).toBeVisible();

    await featureSettings.featureSpecificModelsSwitch.click();

    await expect(featureSettings.deprecatedModelsCallout).toBeHidden();
    await expect(featureSettings.eolModelsCallout).toBeHidden();
  });
});
