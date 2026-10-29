/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  TRANSFORM_HEALTH_DESCRIPTION,
  TRANSFORM_HEALTH_LABEL,
  TRANSFORM_STATE,
} from '../../../../../common/constants';
import type { TransformManagementPage } from '../../fixtures/page_objects';
import type { TransformRequest } from '../../fixtures';
import {
  assertTransformRow,
  getLatestTransformConfig,
  getPivotTransformConfig,
  POLL_TIMEOUT_MS,
  test,
} from '../../fixtures';

const PREFIX = 'starting';

const getFailingPivotTransformConfig = (): TransformRequest => {
  const config = getPivotTransformConfig(PREFIX, true, true);
  return {
    ...config,
    pivot: {
      ...config.pivot,
      aggregations: {
        ...config.pivot.aggregations,
        'products.base_price.fail': {
          avg: { script: { source: "def a = doc['non_existing'].value" } },
        },
      },
    },
  };
};

const batchTestDataList = [
  {
    title: 'batch transform with pivot configuration',
    config: getPivotTransformConfig(PREFIX, false),
  },
  {
    title: 'batch transform with latest configuration',
    config: getLatestTransformConfig(PREFIX, false),
  },
];

const continuousTestDataList = [
  {
    title: 'continuous transform with pivot configuration',
    config: getPivotTransformConfig(PREFIX, true),
    health: 'green' as const,
  },
  {
    title: 'non healthy continuous transform with pivot configuration',
    config: getFailingPivotTransformConfig(),
    health: 'yellow' as const,
  },
  {
    title: 'continuous transform with latest configuration',
    config: getLatestTransformConfig(PREFIX, true),
    health: 'green' as const,
  },
];

const allConfigs = [...batchTestDataList, ...continuousTestDataList].map(({ config }) => config);

const assertStartsTransform = async (
  transformManagement: TransformManagementPage,
  transformId: string,
  health: 'green' | 'yellow'
) => {
  await transformManagement.filterByTransformId(transformId);
  await transformManagement.openRowActions(transformId);
  await expect(transformManagement.getRowAction('Start')).toBeEnabled();
  await transformManagement.closeRowActions(transformId);
  await transformManagement.clickRowAction(transformId, 'Start');
  await transformManagement.confirmModal('Start');

  await transformManagement.expandRow(transformId);
  await transformManagement.openExpandedRowTab('Health');
  await expect(transformManagement.getExpandedRowTabContent('Health')).toContainText(
    TRANSFORM_HEALTH_DESCRIPTION[health],
    { ignoreCase: true }
  );
  await expect(transformManagement.healthIssueTable).toBeVisible({ visible: health !== 'green' });
};

const assertStartedTransformHealth = async (
  transformManagement: TransformManagementPage,
  transformId: string,
  health: 'green' | 'yellow'
) => {
  await assertTransformRow(transformManagement, transformId, {
    health: TRANSFORM_HEALTH_LABEL[health],
  });
  for (const state of [TRANSFORM_STATE.FAILED, TRANSFORM_STATE.ABORTING]) {
    await expect(transformManagement.getRowCell(transformId, 'Status')).not.toContainText(state);
  }
};

test.describe('Start transform', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    for (const config of allConfigs) {
      // The failing script agg only passes creation without validation.
      await apiServices.transform.createTransform({
        ...config,
        defer_validation: config.settings?.unattended === true,
      });
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

  for (const { title, config } of batchTestDataList) {
    test(`starts a ${title}`, async ({ pageObjects }) => {
      const { transformManagement } = pageObjects;
      const transformId = config.transform_id;

      await test.step('starts the transform and shows a healthy expanded row', async () => {
        await assertStartsTransform(transformManagement, transformId, 'green');
      });

      await test.step('shows progress for the transform in the list', async () => {
        await expect(async () => {
          await transformManagement.refreshList();
          const progress = await transformManagement
            .getRowProgress(transformId)
            .getAttribute('value');
          expect(Number(progress)).toBeGreaterThan(0);
        }).toPass({ timeout: POLL_TIMEOUT_MS });
        await assertStartedTransformHealth(transformManagement, transformId, 'green');
      });
    });
  }

  for (const { title, config, health } of continuousTestDataList) {
    test(`starts a ${title}`, async ({ pageObjects }) => {
      const { transformManagement } = pageObjects;
      const transformId = config.transform_id;

      await test.step('starts the transform and shows its health in the expanded row', async () => {
        await assertStartsTransform(transformManagement, transformId, health);
      });

      await test.step('shows the running transform in the list', async () => {
        await expect(async () => {
          await transformManagement.refreshList();
          await expect(transformManagement.getRowCell(transformId, 'Status')).not.toContainText(
            TRANSFORM_STATE.STOPPED
          );
        }).toPass({ timeout: POLL_TIMEOUT_MS });
        await assertStartedTransformHealth(transformManagement, transformId, health);
      });
    });
  }
});
