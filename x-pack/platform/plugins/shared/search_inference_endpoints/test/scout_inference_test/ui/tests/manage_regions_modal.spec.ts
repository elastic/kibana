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
  mockRegionPolicyDeleteConflict,
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

  test('enabling the custom policy toggle reveals the Geo tab', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsCustomPolicyToggle.click();
    await expect(eisModels.manageRegionsGeoTab).toBeVisible();
  });

  test('info callout is hidden until the custom policy toggle is on, and is dismissible', async ({
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsCallout).toBeHidden();

    await eisModels.manageRegionsCustomPolicyToggle.click();
    await expect(eisModels.manageRegionsCallout).toBeVisible();

    await eisModels.manageRegionsCalloutDismiss.click();
    await expect(eisModels.manageRegionsCallout).toBeHidden();
  });

  test('selecting all geos enables Save, deselecting them again disables it', async ({
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();
    await eisModels.manageRegionsCustomPolicyToggle.click();

    await eisModels.manageRegionsSelectAllButton.click();
    await expect(eisModels.manageRegionsSaveButton).toBeEnabled();

    await eisModels.manageRegionsSelectAllButton.click();
    await expect(eisModels.manageRegionsSaveButton).toBeDisabled();
  });

  test('clicking Save opens the confirmation modal listing pending geos', async ({
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();
    await eisModels.manageRegionsCustomPolicyToggle.click();

    await eisModels.geoZoneCheckbox('eu').click();
    await eisModels.geoZoneCheckbox('us').click();
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
    await eisModels.manageRegionsCustomPolicyToggle.click();

    await eisModels.geoZoneCheckbox('eu').click();
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
    await eisModels.manageRegionsCustomPolicyToggle.click();

    await eisModels.geoZoneCheckbox('eu').click();
    await eisModels.manageRegionsSaveButton.click();
    await expect(eisModels.confirmRegionChangeModal).toBeVisible();

    await eisModels.confirmRegionChangeSaveButton.click();

    await expect(eisModels.confirmRegionChangeModal).toBeHidden();
    await expect(eisModels.manageRegionsModal).toBeHidden();
  });

  test('reopening the modal after a save reflects the saved policy without a page reload', async ({
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;
    await mockNoRegionPolicy(page);

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();
    await eisModels.manageRegionsCustomPolicyToggle.click();

    await eisModels.geoZoneCheckbox('eu').click();
    await eisModels.manageRegionsSaveButton.click();
    await expect(eisModels.confirmRegionChangeModal).toBeVisible();
    await eisModels.confirmRegionChangeSaveButton.click();
    await expect(eisModels.manageRegionsModal).toBeHidden();

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await test.step('the just-saved geo is pre-selected', async () => {
      await expect(eisModels.manageRegionsCustomPolicyToggle).toBeChecked();
      await expect(eisModels.geoZoneCheckbox('eu')).toBeChecked();
      await expect(eisModels.geoZoneCheckbox('apac')).not.toBeChecked();
    });
  });

  test('switching to the Regions tab shows zone accordion panels', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();
    await eisModels.manageRegionsCustomPolicyToggle.click();

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
    await eisModels.manageRegionsCustomPolicyToggle.click();

    await eisModels.manageRegionsRegionsTab.click();
    await eisModels.manageRegionsExpandAllButton.click();

    await test.step('region checkboxes for all CSP regions are visible', async () => {
      await expect(eisModels.regionCheckbox('aws::ap-southeast-1')).toBeVisible();
      await expect(eisModels.regionCheckbox('aws::eu-west-1')).toBeVisible();
      await expect(eisModels.regionCheckbox('aws::us-east-1')).toBeVisible();
    });

    await test.step('no region checkboxes are checked by default (new policy)', async () => {
      await expect(eisModels.regionCheckbox('aws::ap-southeast-1')).not.toBeChecked();
      await expect(eisModels.regionCheckbox('aws::eu-west-1')).not.toBeChecked();
      await expect(eisModels.regionCheckbox('aws::us-east-1')).not.toBeChecked();
    });
  });

  test('Save on Regions tab opens confirmation with a region list', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();
    await eisModels.manageRegionsCustomPolicyToggle.click();

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

    await test.step('toggle is ON by default for an existing policy', async () => {
      await expect(eisModels.manageRegionsCustomPolicyToggle).toBeChecked();
      await expect(eisModels.manageRegionsGeoTab).toBeVisible();
    });

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

  test('turning the toggle OFF on an existing policy triggers a DELETE after the acknowledge checkbox', async ({
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await unmockRegionPolicy(page);
    const counters = await mockRegionPolicy(page, { allowed_geos: ['eu'] });

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsCustomPolicyToggle.click();
    await eisModels.manageRegionsSaveButton.click();

    await test.step('delete confirmation modal appears', async () => {
      await expect(eisModels.confirmDeleteRegionPolicyModal).toBeVisible();
    });

    await test.step('cancelling the delete confirmation keeps the main modal open', async () => {
      await eisModels.confirmDeleteRegionPolicyCancelButton.click();
      await expect(eisModels.confirmDeleteRegionPolicyModal).toBeHidden();
      await expect(eisModels.manageRegionsModal).toBeVisible();
      expect(counters.deleteRequestCount).toBe(0);
    });

    await eisModels.manageRegionsSaveButton.click();
    await eisModels.confirmDeleteRegionPolicyAcknowledge.click();
    await eisModels.confirmDeleteRegionPolicySaveButton.click();

    await test.step('DELETE is called and both modals close', async () => {
      await expect.poll(() => counters.deleteRequestCount).toBe(1);
      expect(counters.putRequestCount).toBe(0);
      await expect(eisModels.confirmDeleteRegionPolicyModal).toBeHidden();
      await expect(eisModels.manageRegionsModal).toBeHidden();
    });
  });

  test('a failed delete (409 conflict) keeps both modals open for retry', async ({
    page,
    pageObjects,
  }) => {
    const { eisModels } = pageObjects;

    await unmockRegionPolicy(page);
    const counters = await mockRegionPolicyDeleteConflict(page, { allowed_geos: ['eu'] });

    await eisModels.manageRegionsButton.click();
    await expect(eisModels.manageRegionsLoading).toBeHidden();

    await eisModels.manageRegionsCustomPolicyToggle.click();
    await eisModels.manageRegionsSaveButton.click();
    await expect(eisModels.confirmDeleteRegionPolicyModal).toBeVisible();

    await eisModels.confirmDeleteRegionPolicyAcknowledge.click();
    await eisModels.confirmDeleteRegionPolicySaveButton.click();

    await test.step('DELETE is attempted but both modals stay open on conflict', async () => {
      await expect.poll(() => counters.deleteRequestCount).toBe(1);
      await expect(eisModels.confirmDeleteRegionPolicyModal).toBeVisible();
      await expect(eisModels.manageRegionsModal).toBeVisible();
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
