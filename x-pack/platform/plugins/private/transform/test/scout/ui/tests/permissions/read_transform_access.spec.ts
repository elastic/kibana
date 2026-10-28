/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { getPivotTransformConfig, test } from '../../fixtures';

test.describe('Transform list for a read-only user', { tag: tags.deploymentAgnostic }, () => {
  const transformConfig = getPivotTransformConfig('permissions_read_access', false);

  test.afterAll(async ({ apiServices }) => {
    await apiServices.transform.deleteTransforms([transformConfig.transform_id]);
    await apiServices.transform.deleteIndices({ index: transformConfig.dest.index });
  });

  test('shows the transform with disabled actions', async ({
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    const { transformManagement } = pageObjects;
    const transformId = transformConfig.transform_id;
    await apiServices.transform.createAndRunTransform(transformConfig);
    await browserAuth.loginAsTransformViewer();
    await transformManagement.goto();

    await test.step('shows the table and a disabled create button', async () => {
      await expect(transformManagement.statsBar).toBeVisible();
      await expect(transformManagement.listTable).toBeVisible();
      await expect(transformManagement.createButton).toBeDisabled();
    });

    await test.step('shows the transform with every row action disabled', async () => {
      await transformManagement.filterByTransformId(transformId);
      await transformManagement.openRowActions(transformId);
      for (const action of await transformManagement.rowActions.all()) {
        await expect(action).toBeDisabled();
      }
      await transformManagement.closeRowActions(transformId);
    });

    await test.step('shows the expanded row tabs', async () => {
      await transformManagement.expandRow(transformId);
      await expect(transformManagement.getExpandedRowTabContent('Details')).toBeVisible();
      for (const tab of ['Json', 'Health', 'Messages', 'Preview'] as const) {
        await transformManagement.openExpandedRowTab(tab);
        await expect(transformManagement.getExpandedRowTabContent(tab)).toBeVisible();
      }
    });
  });
});
