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
  mockRegionPolicy,
  mockRegionPolicyError,
  unmockRegionPolicy,
} from '../fixtures/mocks';

test.describe('Manage Region Preferences modal', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
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

  test('Manage regions button is visible in the page header', async ({ pageObjects }) => {
    await expect(pageObjects.eisModels.manageRegionsButton).toBeVisible();
  });

  test('clicking the button opens the modal', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsModal).toBeVisible();
  });

  test('Cancel button closes the modal without saving', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsModal).toBeVisible();

    await eisModels.manageRegionsCancelButton.click();
    await expect(eisModels.manageRegionsModal).toBeHidden();
  });

  test('Geo tab is active by default and all geos are pre-selected', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsModal).toBeVisible();

    await test.step('loading completes and geo tab content is visible', async () => {
      await expect(eisModels.manageRegionsLoading).toBeHidden();
      await expect(eisModels.manageRegionsGeoTab).toBeVisible();
    });

    await test.step('all geos from mock data are shown and checked', async () => {
      for (const geo of ['apac', 'eu', 'us']) {
        await expect(eisModels.geoZoneRow(geo)).toBeVisible();
        const checkbox = eisModels.geoZoneCheckbox(geo);
        await expect(checkbox).toBeChecked();
      }
    });
  });

  test('info callout is shown by default and is dismissible', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsCallout).toBeVisible();

    await eisModels.manageRegionsCallout.getByRole('button', { name: /dismiss/i }).click();
    await expect(eisModels.manageRegionsCallout).toBeHidden();
  });

  test('Save button is enabled for a new policy (all geos selected = isNewPolicy)', async ({
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await expect(eisModels.manageRegionsSaveButton).toBeEnabled();
  });

  test('deselecting all geos disables the Save button', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsSelectAllButton.click();

    await expect(eisModels.manageRegionsSaveButton).toBeDisabled();
  });

  test('clicking Save opens the confirmation modal listing pending geos', async ({
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.geoZoneCheckbox('apac').click();
    await expect(eisModels.manageRegionsSaveButton).toBeEnabled();

    await eisModels.manageRegionsSaveButton.click();

    await test.step('confirmation modal appears', async () => {
      await expect(eisModels.confirmRegionChangeModal).toBeVisible();
    });

    await test.step('geo list shows only the selected geos', async () => {
      const geoList = eisModels.confirmRegionChangeModalGeoList;
      await expect(geoList).toBeVisible();
      await expect(geoList).not.toContainText('Asia Pacific');
      await expect(geoList).toContainText('Europe');
      await expect(geoList).toContainText('North America');
    });
  });

  test('cancelling the confirmation modal dismisses it and keeps the main modal open', async ({
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsSaveButton.click();
    await expect(eisModels.confirmRegionChangeModal).toBeVisible();

    await eisModels.confirmRegionChangeCancelButton.click();

    await expect(eisModels.confirmRegionChangeModal).toBeHidden();
    await expect(eisModels.manageRegionsModal).toBeVisible();
  });

  test('confirming the geo save closes both modals', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsSaveButton.click();
    await expect(eisModels.confirmRegionChangeModal).toBeVisible();

    await eisModels.confirmRegionChangeSaveButton.click();

    await expect(eisModels.confirmRegionChangeModal).toBeHidden();
    await expect(eisModels.manageRegionsModal).toBeHidden();
  });

  test('switching to the Regions tab shows zone accordion panels', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsRegionsTab.click();

    await test.step('zone panels for all geos are visible', async () => {
      for (const geo of ['apac', 'eu', 'us']) {
        await expect(eisModels.regionZonePanel(geo)).toBeVisible();
      }
    });

    await test.step('Expand all button is visible on the Regions tab', async () => {
      await expect(eisModels.manageRegionsExpandAllButton).toBeVisible();
    });
  });

  test('Expand all on the Regions tab reveals individual region checkboxes', async ({
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsRegionsTab.click();
    await eisModels.manageRegionsExpandAllButton.click();

    await test.step('region checkboxes for all CSP regions are visible', async () => {
      await expect(eisModels.regionCheckbox('aws::ap-southeast-1')).toBeVisible();
      await expect(eisModels.regionCheckbox('aws::eu-west-1')).toBeVisible();
      await expect(eisModels.regionCheckbox('aws::us-east-1')).toBeVisible();
    });

    await test.step('all region checkboxes are checked by default (new policy)', async () => {
      await expect(eisModels.regionCheckbox('aws::ap-southeast-1')).toBeChecked();
      await expect(eisModels.regionCheckbox('aws::eu-west-1')).toBeChecked();
      await expect(eisModels.regionCheckbox('aws::us-east-1')).toBeChecked();
    });
  });

  test('Save on Regions tab opens confirmation with a region list', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsRegionsTab.click();
    await eisModels.manageRegionsExpandAllButton.click();

    await eisModels.regionCheckbox('aws::ap-southeast-1').click();
    await eisModels.manageRegionsSaveButton.click();

    await test.step('confirmation modal appears with region list', async () => {
      await expect(eisModels.confirmRegionChangeModal).toBeVisible();
      await expect(eisModels.confirmRegionChangeModalRegionList).toBeVisible();
      await expect(eisModels.confirmRegionChangeModalGeoList).toBeHidden();
    });
  });

  test('existing geo policy pre-selects matching geos and Save is disabled (not dirty)', async ({
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await unmockRegionPolicy(page);
    await mockRegionPolicy(page, { allowed_geos: ['eu'] });

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await test.step('only eu is checked', async () => {
      await expect(eisModels.geoZoneCheckbox('eu')).toBeChecked();
      await expect(eisModels.geoZoneCheckbox('apac')).not.toBeChecked();
      await expect(eisModels.geoZoneCheckbox('us')).not.toBeChecked();
    });

    await test.step('Save is disabled when policy is unchanged', async () => {
      await expect(eisModels.manageRegionsSaveButton).toBeDisabled();
    });

    await test.step('changing selection enables Save', async () => {
      await eisModels.geoZoneCheckbox('us').click();
      await expect(eisModels.manageRegionsSaveButton).toBeEnabled();
    });
  });

  test('existing regions policy switches to Regions tab and pre-selects matching regions', async ({
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await unmockRegionPolicy(page);
    await mockRegionPolicy(page, {
      allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }],
    });

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await test.step('Regions tab is active when policy has allowed_regions', async () => {
      await expect(eisModels.manageRegionsRegionsTab).toHaveAttribute('aria-selected', 'true');
    });

    await test.step('eu-west-1 region is pre-selected', async () => {
      await eisModels.manageRegionsExpandAllButton.click();
      await expect(eisModels.regionCheckbox('aws::eu-west-1')).toBeChecked();
      await expect(eisModels.regionCheckbox('aws::ap-southeast-1')).not.toBeChecked();
      await expect(eisModels.regionCheckbox('aws::us-east-1')).not.toBeChecked();
    });

    await test.step('Save is disabled when policy is unchanged', async () => {
      await expect(eisModels.manageRegionsSaveButton).toBeDisabled();
    });
  });

  test('error callout is displayed when region policy fetch fails', async ({
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await unmockRegionPolicy(page);
    await mockRegionPolicyError(page);

    await eisModels.manageRegionsButton.click();

    await expect(eisModels.manageRegionsErrorCallout).toBeVisible();
  });
});
