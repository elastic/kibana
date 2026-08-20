/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { test } from '../fixtures';
import { eisEndpointsMockData } from '../fixtures/mock_data/eis_endpoints';
import {
  mockInferenceEndpoints,
  unmockInferenceEndpoints,
  mockNoRegionPolicy,
  mockRegionPolicyPutInUseConflict,
  unmockRegionPolicy,
} from '../fixtures/mocks';

const REGION_PREFERENCES_REDESIGN_FEATURE_FLAG = 'searchSolution.regionPreferencesRedesignEnabled';

test.describe('Confirm region selection modal', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [REGION_PREFERENCES_REDESIGN_FEATURE_FLAG]: true,
      },
    });
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await mockInferenceEndpoints(page, eisEndpointsMockData);
    await mockNoRegionPolicy(page);
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.eisModels.goto();
  });

  test.afterEach(async ({ page }) => {
    await unmockInferenceEndpoints(page);
    await unmockRegionPolicy(page);
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [REGION_PREFERENCES_REDESIGN_FEATURE_FLAG]: null,
      },
    });
  });

  test('Save opens the confirm region selection modal instead of the legacy confirm modal', async ({
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await eisModels.startGeoPolicySave('eu');

    await expect(eisModels.confirmRegionSelectionModal).toBeVisible();
    await expect(eisModels.confirmRegionChangeModal).toBeHidden();
    await expect(eisModels.confirmRegionSelectionGeoList).toBeVisible();
  });

  test('an in-use 409 keeps the confirmation open with Issues; ignore and save retries with force', async ({
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await unmockRegionPolicy(page);
    const counters = await mockRegionPolicyPutInUseConflict(page);

    await eisModels.startGeoPolicySave('eu');
    await expect(eisModels.confirmRegionSelectionModal).toBeVisible();

    await eisModels.confirmRegionSelectionSaveButton.click();

    await test.step('conflict stays in the confirmation modal', async () => {
      await expect.poll(() => counters.putRequestCount).toBe(1);
      expect(counters.forcePutRequestCount).toBe(0);
      await expect(eisModels.confirmRegionSelectionModal).toBeVisible();
      await expect(eisModels.confirmRegionSelectionCallout).toBeVisible();
      await expect(eisModels.confirmRegionSelectionIssue(0)).toBeVisible();
      await expect(eisModels.manageRegionsModal).toBeVisible();
    });

    await eisModels.confirmRegionSelectionIgnoreCheckbox.click();
    await eisModels.confirmRegionSelectionSaveButton.click();

    await test.step('force retry closes both modals', async () => {
      await expect.poll(() => counters.forcePutRequestCount).toBe(1);
      await expect(eisModels.confirmRegionSelectionModal).toBeHidden();
      await expect(eisModels.manageRegionsModal).toBeHidden();
    });
  });
});
