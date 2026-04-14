/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { mockEisEndpoints } from '../fixtures/mock_data/eis_endpoints';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

test.describe(
  'EIS Models Page',
  { tag: ['@local-stateful-classic', '@local-stateful-search', '@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await mockInferenceEndpoints(page, mockEisEndpoints);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.eisModels.goto();
    });

    test.afterEach(async ({ page }) => {
      await unmockInferenceEndpoints(page);
    });

    test('displays page header and documentation link', async ({ pageObjects }) => {
      await expect(pageObjects.eisModels.pageHeader).toBeVisible();
      await expect(pageObjects.eisModels.documentationLink).toBeVisible();
    });
  }
);
