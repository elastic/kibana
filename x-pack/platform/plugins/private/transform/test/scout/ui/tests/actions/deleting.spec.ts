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
  assertTransformRow,
  getLatestTransformConfig,
  getPivotTransformConfig,
  test,
} from '../../fixtures';

const PREFIX = 'deleting';

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

const assertDeletesTransform = async (
  transformManagement: TransformManagementPage,
  transformId: string
) => {
  await transformManagement.openRowActions(transformId);
  await expect(transformManagement.getRowAction('Delete')).toBeEnabled();
  await transformManagement.closeRowActions(transformId);
  await transformManagement.clickRowAction(transformId, 'Delete');
  await expect(transformManagement.getModal('Delete')).toBeVisible();
  await transformManagement.confirmModal('Delete');
  await expect(transformManagement.getRow(transformId)).toBeHidden();
};

test.describe('Delete transform', { tag: tags.deploymentAgnostic }, () => {
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
    test(`deletes a ${title}`, async ({ pageObjects }) => {
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

      await test.step('deletes the transform', async () => {
        await assertDeletesTransform(transformManagement, transformId);
      });
    });
  }

  test('deletes a continuous transform with pivot configuration after stopping it', async ({
    pageObjects,
  }) => {
    const { transformManagement } = pageObjects;
    const transformId = continuousConfig.transform_id;
    await expect(transformManagement.listTable).toBeVisible();
    await transformManagement.filterByTransformId(transformId);

    await test.step('stops the running transform first', async () => {
      await transformManagement.openRowActions(transformId);
      await expect(transformManagement.getRowAction('Delete')).toBeDisabled();
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

    await test.step('deletes the transform', async () => {
      await assertDeletesTransform(transformManagement, transformId);
    });
  });
});
