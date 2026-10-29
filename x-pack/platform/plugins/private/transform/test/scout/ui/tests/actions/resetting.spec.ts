/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { TransformManagementPage } from '../../fixtures/page_objects';
import {
  assertExpandedRowMessage,
  assertTransformRow,
  getLatestTransformConfig,
  getPivotTransformConfig,
  test,
} from '../../fixtures';

const PREFIX = 'resetting';

const batchTestDataList = [
  {
    title: 'batch transform with pivot configuration',
    config: getPivotTransformConfig(PREFIX, false),
    type: 'pivot',
  },
  {
    title: 'batch transform with latest configuration',
    config: getLatestTransformConfig(PREFIX),
    type: 'latest',
  },
];
const continuousConfig = getPivotTransformConfig(PREFIX, true);
const allConfigs = [...batchTestDataList.map(({ config }) => config), continuousConfig];

const assertResetsTransform = async (
  transformManagement: TransformManagementPage,
  transformId: string
) => {
  await transformManagement.openRowActions(transformId);
  await expect(transformManagement.getRowAction('Reset')).toBeEnabled();
  await transformManagement.closeRowActions(transformId);
  await transformManagement.clickRowAction(transformId, 'Reset');
  await expect(transformManagement.getModal('Reset')).toBeVisible();
  await transformManagement.confirmModal('Reset');

  await transformManagement.refreshList();
  await transformManagement.filterByTransformId(transformId);
  await transformManagement.expandRow(transformId);
  await assertExpandedRowMessage(transformManagement, 'reset transform.');
};

test.describe('Reset transform', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    for (const config of allConfigs) {
      await apiServices.transform.createAndRunTransform(config);
    }
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsTransformManager();
    await pageObjects.transformManagement.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.transform.deleteTransforms(allConfigs.map((c) => c.transform_id));
    for (const config of allConfigs) {
      await apiServices.transform.deleteIndices({ index: config.dest.index });
    }
  });

  for (const { title, config, type } of batchTestDataList) {
    test(`resets a ${title}`, async ({ pageObjects }) => {
      const { transformManagement } = pageObjects;
      const transformId = config.transform_id;
      await expect(transformManagement.listTable).toBeVisible();
      await transformManagement.filterByTransformId(transformId);

      await test.step('shows the finished transform', async () => {
        await assertTransformRow(transformManagement, transformId, {
          description: config.description,
          type,
          status: 'stopped',
          mode: 'batch',
          progress: 100,
          health: 'Healthy',
        });
      });

      await test.step('resets the transform and shows a reset message', async () => {
        await assertResetsTransform(transformManagement, transformId);
      });
    });
  }

  test('resets a continuous transform with pivot configuration after stopping it', async ({
    pageObjects,
  }) => {
    const { transformManagement } = pageObjects;
    const transformId = continuousConfig.transform_id;
    await expect(transformManagement.listTable).toBeVisible();
    await transformManagement.filterByTransformId(transformId);

    await test.step('stops the running transform first', async () => {
      await transformManagement.openRowActions(transformId);
      await expect(transformManagement.getRowAction('Reset')).toBeDisabled();
      await transformManagement.closeRowActions(transformId);
      await transformManagement.clickRowAction(transformId, 'Stop');
    });

    await test.step('shows the stopped transform', async () => {
      await assertTransformRow(transformManagement, transformId, {
        description: continuousConfig.description,
        type: 'pivot',
        status: 'stopped',
        mode: 'continuous',
        progress: null,
        health: 'Healthy',
      });
    });

    await test.step('resets the transform and shows a reset message', async () => {
      await assertResetsTransform(transformManagement, transformId);
    });
  });
});
