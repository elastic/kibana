/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Feature Settings', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ uiSettings }) => {
    await uiSettings.set({ 'searchInferenceEndpoints:modelSettingsEnabled': true });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.featureSettings.goto();
  });

  test.afterAll(async ({ uiSettings }) => {
    await uiSettings.unset('searchInferenceEndpoints:modelSettingsEnabled');
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
      await expect(
        featureSettings.content.locator('[data-test-subj^="featureSection-"]')
      ).toHaveCount(0);
    });

    await test.step('disable disallow other models', async () => {
      await featureSettings.disallowOtherModelsCheckbox.click();
    });

    await test.step('feature sections reappear', async () => {
      await expect(
        featureSettings.content.locator('[data-test-subj^="featureSection-"]')
      ).not.toHaveCount(0);
    });
  });
});
