/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  assertNoA11yViolations,
  assertStoppedTransformRowActions,
  getPivotTransformConfig,
  test,
} from '../../fixtures';

test.describe(
  'Transform list for a user with full access',
  { tag: tags.deploymentAgnostic },
  () => {
    const transformConfig = getPivotTransformConfig('permissions_full_access', false);

    test.afterAll(async ({ apiServices }) => {
      await apiServices.transform.deleteTransforms([transformConfig.transform_id]);
      await apiServices.transform.deleteIndices({ index: transformConfig.dest.index });
    });

    test('shows the transform with its actions', async ({
      apiServices,
      browserAuth,
      page,
      pageObjects,
    }) => {
      const { transformManagement } = pageObjects;
      const transformId = transformConfig.transform_id;
      await apiServices.transform.createAndRunTransform(transformConfig);
      await browserAuth.loginAsTransformManager();
      await transformManagement.goto();

      await test.step('shows the table and an enabled create button', async () => {
        await expect(transformManagement.statsBar).toBeVisible();
        await expect(transformManagement.listTable).toBeVisible();
        await expect(transformManagement.createButton).toBeEnabled();
        await assertNoA11yViolations(page);
      });

      await test.step('shows the row actions of a stopped transform', async () => {
        await transformManagement.filterByTransformId(transformId);
        await assertStoppedTransformRowActions(transformManagement, transformId);
        await transformManagement.openRowActions(transformId);
        for (const action of ['Edit', 'Clone', 'Delete'] as const) {
          await expect(transformManagement.getRowAction(action)).toBeEnabled();
        }
        for (const action of ['Discover', 'Start'] as const) {
          await expect(transformManagement.getRowAction(action)).toBeDisabled();
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
  }
);
