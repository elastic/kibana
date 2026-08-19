/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { FEATURE_PRIVILEGED_ROLE, FEATURE_READ_ROLE } from '../../api/constants';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { test } from '../fixtures';
import { eisEndpointsMockData } from '../fixtures/mock_data/eis_endpoints';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

test.describe('Manage regions privileges', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  test.beforeEach(async ({ page }) => {
    await mockInferenceEndpoints(page, eisEndpointsMockData);
  });

  test.afterEach(async ({ page }) => {
    await unmockInferenceEndpoints(page);
  });

  test('feature-privileged user can see Manage regions', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(FEATURE_PRIVILEGED_ROLE);
    await pageObjects.eisModels.goto();

    await expect(pageObjects.eisModels.pageHeader).toBeVisible();
    await expect(pageObjects.eisModels.manageRegionsButton).toBeVisible();
  });

  test('feature-read user cannot see Manage regions', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(FEATURE_READ_ROLE);
    await pageObjects.eisModels.goto();

    await expect(pageObjects.eisModels.pageHeader).toBeVisible();
    await expect(pageObjects.eisModels.manageRegionsButton).toBeHidden();
  });
});
