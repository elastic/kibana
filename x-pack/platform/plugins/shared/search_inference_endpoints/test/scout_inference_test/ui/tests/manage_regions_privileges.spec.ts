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

  test('feature-read user cannot see Edit Region preferences in blocked model flyout', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await test.step('mock Anthropic model as denied by region policy', async () => {
      await unmockInferenceEndpoints(page);
      await mockInferenceEndpoints(
        page,
        eisEndpointsMockData.map((endpoint) =>
          endpoint.service_settings?.model_id === 'anthropic-claude-3.7-sonnet'
            ? {
                ...endpoint,
                metadata: { ...endpoint.metadata, denied_by_region_policy: true },
              }
            : endpoint
        )
      );
    });

    await test.step('log in as read-only user and open blocked model flyout', async () => {
      await browserAuth.loginWithCustomRole(FEATURE_READ_ROLE);
      await eisModels.goto();
      await eisModels.showModelsOutsideRegionPreferences();
      await eisModels.modelCard('Anthropic Claude Sonnet 3.7').click();
      await expect(eisModels.flyout).toBeVisible();
    });

    await test.step('blocked callout is visible', async () => {
      await expect(eisModels.flyoutRegionUnavailableCallout).toBeVisible();
    });

    await test.step('expand callout details and verify Edit button is hidden', async () => {
      await eisModels.flyoutViewDetailsButton.click();
      await expect(eisModels.flyoutEditRegionPreferencesButton).toBeHidden();
    });
  });

  test('feature-privileged user can see Edit Region preferences in blocked model flyout', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await test.step('mock Anthropic model as denied by region policy', async () => {
      await unmockInferenceEndpoints(page);
      await mockInferenceEndpoints(
        page,
        eisEndpointsMockData.map((endpoint) =>
          endpoint.service_settings?.model_id === 'anthropic-claude-3.7-sonnet'
            ? {
                ...endpoint,
                metadata: { ...endpoint.metadata, denied_by_region_policy: true },
              }
            : endpoint
        )
      );
    });

    await test.step('log in as privileged user and open blocked model flyout', async () => {
      await browserAuth.loginWithCustomRole(FEATURE_PRIVILEGED_ROLE);
      await eisModels.goto();
      await eisModels.showModelsOutsideRegionPreferences();
      await eisModels.modelCard('Anthropic Claude Sonnet 3.7').click();
      await expect(eisModels.flyout).toBeVisible();
    });

    await test.step('blocked callout is visible', async () => {
      await expect(eisModels.flyoutRegionUnavailableCallout).toBeVisible();
    });

    await test.step('expand callout details and verify Edit button is visible', async () => {
      await eisModels.flyoutViewDetailsButton.click();
      await expect(eisModels.flyoutEditRegionPreferencesButton).toBeVisible();
    });
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
