/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { TransformManagementPage } from '../../fixtures/page_objects';
import type { TransformRequest } from '../../fixtures';
import {
  assertExpandedRowMessage,
  assertTransformRow,
  getLatestTransformConfig,
  getPivotTransformConfig,
  test,
} from '../../fixtures';

const UPDATED_DESCRIPTION = 'updated description';

const pivotConfig = getPivotTransformConfig('editing');
const latestConfig: TransformRequest = {
  ...getLatestTransformConfig('editing'),
  retention_policy: { time: { field: 'order_date', max_age: '1d' } },
};

const assertEditFlyoutUpdates = async (
  transformManagement: TransformManagementPage,
  config: TransformRequest,
  numFailureRetries: string
) => {
  const input = (name: string) => transformManagement.getEditFlyoutInput(name);

  await transformManagement.filterByTransformId(config.transform_id);
  await transformManagement.openEditFlyout(config.transform_id);

  await expect(input('Description')).toHaveValue(config.description);
  await input('Description').fill(UPDATED_DESCRIPTION);

  await transformManagement.openEditFlyoutAccordion('Destination');
  await expect(input('DestinationIndex')).toBeEnabled();
  await expect(transformManagement.editFlyoutIngestPipelineSelect).toBeVisible();

  await transformManagement.openEditFlyoutAccordion('AdvancedSettings');
  await expect(input('MaxPageSearchSize')).toBeEnabled();
  await expect(input('DocsPerSecond')).toHaveValue('');
  await input('DocsPerSecond').fill('1000');
  await expect(input('NumFailureRetries')).toHaveValue('');
  await input('NumFailureRetries').fill(numFailureRetries);

  await expect(input('Frequency')).toHaveValue(String(config.frequency ?? ''));
  await input('Frequency').fill('10m');
};

const assertUpdatedTransform = async (
  transformManagement: TransformManagementPage,
  config: TransformRequest,
  type: string
) => {
  await expect(transformManagement.editFlyoutUpdateButton).toBeEnabled();
  await transformManagement.editFlyoutUpdateButton.click();
  await expect(transformManagement.editFlyout).toBeHidden();

  await transformManagement.refreshList();
  await transformManagement.filterByTransformId(config.transform_id);
  await assertTransformRow(transformManagement, config.transform_id, {
    description: UPDATED_DESCRIPTION,
    type,
    status: 'stopped',
    mode: 'batch',
    progress: 100,
    health: 'Healthy',
  });

  await transformManagement.expandRow(config.transform_id);
  await transformManagement.openExpandedRowTab('Json');
  await expect(transformManagement.getExpandedRowTabContent('Json')).toContainText(
    UPDATED_DESCRIPTION
  );
  await assertExpandedRowMessage(transformManagement, 'updated transform.');
  await transformManagement.openExpandedRowTab('Json');
};

test.describe('Edit transform', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.transform.createAndRunTransform(pivotConfig);
    await apiServices.transform.createAndRunTransform(latestConfig);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsTransformManager();
    await pageObjects.transformManagement.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.transform.deleteTransforms([
      pivotConfig.transform_id,
      latestConfig.transform_id,
    ]);
    for (const config of [pivotConfig, latestConfig]) {
      await apiServices.transform.deleteIndices({ index: config.dest.index });
    }
  });

  test('edits a transform with pivot configuration', async ({ pageObjects }) => {
    const { transformManagement } = pageObjects;

    await test.step('updates the fields in the edit flyout', async () => {
      await assertEditFlyoutUpdates(transformManagement, pivotConfig, '0');
      // The pivot destination has no date field to apply a retention policy to.
      await expect(transformManagement.editFlyoutRetentionPolicySwitch).toBeDisabled();
    });

    await test.step('saves the transform and shows the update', async () => {
      await assertUpdatedTransform(transformManagement, pivotConfig, 'pivot');
      await expect(transformManagement.getExpandedRowTabContent('Json')).not.toContainText(
        'retention_policy'
      );
    });
  });

  test('edits a transform with latest configuration', async ({ pageObjects }) => {
    const { transformManagement } = pageObjects;

    await test.step('updates the fields in the edit flyout', async () => {
      await assertEditFlyoutUpdates(transformManagement, latestConfig, '7');
      await expect(transformManagement.editFlyoutRetentionPolicySwitch).toBeEnabled();
    });

    await test.step('saves the transform and keeps its retention policy', async () => {
      await assertUpdatedTransform(transformManagement, latestConfig, 'latest');
      await expect(transformManagement.getExpandedRowTabContent('Json')).toContainText(
        'retention_policy'
      );
    });
  });
});
