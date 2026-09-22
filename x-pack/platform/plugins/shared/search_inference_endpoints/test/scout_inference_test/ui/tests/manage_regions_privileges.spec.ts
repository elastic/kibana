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
import {
  mockInferenceEndpoints,
  mockNoRegionPolicy,
  mockRegionPolicy,
  unmockInferenceEndpoints,
  unmockRegionPolicy,
} from '../fixtures/mocks';

test.describe('Manage regions privileges', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  test.beforeEach(async ({ page }) => {
    await mockInferenceEndpoints(page, eisEndpointsMockData);
    await mockNoRegionPolicy(page);
  });

  test.afterEach(async ({ page }) => {
    await unmockInferenceEndpoints(page);
    await unmockRegionPolicy(page);
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

  test('feature-read user sees a read-only Restricted regions badge when a policy is set', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await unmockRegionPolicy(page);
    await mockRegionPolicy(page, { allowed_geos: ['us'] });
    await browserAuth.loginWithCustomRole(FEATURE_READ_ROLE);
    await pageObjects.eisModels.goto();

    await expect(pageObjects.eisModels.restrictedRegionsBadge).toBeVisible();
    await pageObjects.eisModels.restrictedRegionsBadge.click();
    await expect(pageObjects.eisModels.restrictedRegionsPopover).toBeVisible();
    await expect(pageObjects.eisModels.restrictedRegionsEditButton).toBeHidden();
    await expect(pageObjects.eisModels.manageRegionsButton).toBeHidden();
  });

  test('feature-privileged user can edit from the Restricted regions popover', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await unmockRegionPolicy(page);
    await mockRegionPolicy(page, { allowed_geos: ['us'] });
    await browserAuth.loginWithCustomRole(FEATURE_PRIVILEGED_ROLE);
    await pageObjects.eisModels.goto();

    await expect(pageObjects.eisModels.restrictedRegionsBadge).toBeVisible();
    await pageObjects.eisModels.restrictedRegionsBadge.click();
    await expect(pageObjects.eisModels.restrictedRegionsEditButton).toBeVisible();
    await pageObjects.eisModels.restrictedRegionsEditButton.click();
    await expect(pageObjects.eisModels.manageRegionsModal).toBeVisible();
  });
});
