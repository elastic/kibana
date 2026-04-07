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
});
