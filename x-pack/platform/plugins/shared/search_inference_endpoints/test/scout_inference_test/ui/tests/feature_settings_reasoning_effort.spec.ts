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
  mockInferenceEndpoints,
  unmockConnectors,
  unmockInferenceEndpoints,
} from '../fixtures/mocks';

const FEATURE_ID = 'test_feature_alpha';
const ENDPOINT_ID = '.mock-anthropic-claude-3.7-sonnet-chat_completion-a3f1';

test.describe('Feature Settings reasoning effort', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await mockInferenceEndpoints(page, mockEndpointsData);
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.featureSettings.goto();
  });

  test.afterEach(async ({ page, kbnClient }) => {
    await unmockConnectors(page);
    await unmockInferenceEndpoints(page);
    await kbnClient.request({
      method: 'PUT',
      path: '/internal/search_inference_endpoints/settings',
      headers: { 'x-elastic-internal-origin': 'kibana', 'elastic-api-version': '1' },
      body: { features: [] },
    });
  });

  test('saves a reasoning effort for a model and keeps it after reload', async ({
    pageObjects,
  }) => {
    const { featureSettings } = pageObjects;

    await test.step('add a model that supports reasoning effort', async () => {
      await featureSettings.disableRecommendedDefaults(FEATURE_ID);
      await featureSettings.addModelButton(FEATURE_ID).click();
      await featureSettings.addModelSearch.fill('anthropic');
      await expect(featureSettings.addModelOptions).toHaveCount(1);
      await featureSettings.addModelOptions.click();
    });

    await test.step('set the effort from the row', async () => {
      await featureSettings.setEffort(ENDPOINT_ID, 'high');
      await expect(featureSettings.effortBadge(ENDPOINT_ID)).toHaveText('high');
    });

    await test.step('save and reload', async () => {
      await featureSettings.saveButton.click();
      await expect(featureSettings.saveButton).toBeDisabled();
      await featureSettings.goto();
    });

    await test.step('the saved effort is shown', async () => {
      await expect(featureSettings.effortBadge(ENDPOINT_ID)).toHaveText('high');
    });
  });
});
