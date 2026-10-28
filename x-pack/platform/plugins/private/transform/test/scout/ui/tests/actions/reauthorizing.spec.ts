/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { TRANSFORM_HEALTH_LABEL, TRANSFORM_STATE } from '../../../../../common/constants';
import type { TransformManagementPage } from '../../fixtures/page_objects';
import type { ExpectedTransformRow, TransformRequest } from '../../fixtures';
import {
  assertTransformRow,
  getLatestTransformConfig,
  getPivotTransformConfig,
  test,
  testData,
} from '../../fixtures';

type TransformUser = 'manager' | 'viewer';

const PREFIX = 'reauthorizing';
const UNAUTHORIZED_STATE = { status: TRANSFORM_STATE.STOPPED, health: TRANSFORM_HEALTH_LABEL.red };

const reauthorizedByManagerTestDataList = [
  {
    title: 'batch pivot transform created by viewer',
    config: getPivotTransformConfig(PREFIX, false),
    reauthorizedState: {
      status: TRANSFORM_STATE.STOPPED,
      progress: 100,
      health: TRANSFORM_HEALTH_LABEL.green,
    },
  },
  {
    title: 'continuous pivot transform created by viewer',
    config: getPivotTransformConfig(`${PREFIX}-viewer-2`, true),
    reauthorizedState: { status: TRANSFORM_STATE.STARTED, health: TRANSFORM_HEALTH_LABEL.green },
  },
];

const viewedByViewerTestDataList: Array<{
  title: string;
  config: TransformRequest;
  createdBy: TransformUser;
  state: ExpectedTransformRow;
}> = [
  {
    title: 'continuous pivot transform created by viewer',
    config: getPivotTransformConfig(`${PREFIX}-viewer-1`, true),
    createdBy: 'viewer',
    state: UNAUTHORIZED_STATE,
  },
  {
    title: 'continuous latest transform created by manager',
    config: getLatestTransformConfig(`${PREFIX}-manager-1`, true),
    createdBy: 'manager',
    state: { status: TRANSFORM_STATE.STARTED, health: TRANSFORM_HEALTH_LABEL.green },
  },
];

const transformsToCreate = [
  ...reauthorizedByManagerTestDataList.map(({ config }) => ({
    config,
    createdBy: 'viewer' as TransformUser,
  })),
  ...viewedByViewerTestDataList.map(({ config, createdBy }) => ({ config, createdBy })),
];

const showsReauthorizeCallout = async (
  transformManagement: TransformManagementPage,
  transformId: string,
  state: ExpectedTransformRow
) => {
  await expect(transformManagement.listTable).toBeVisible();
  await expect(transformManagement.reauthorizeCallout).toBeVisible();
  await transformManagement.filterByTransformId(transformId);
  await assertTransformRow(transformManagement, transformId, state);
};

test.describe('Reauthorize transform', { tag: tags.deploymentAgnostic }, () => {
  const apiKeyIds: string[] = [];

  test.beforeAll(async ({ apiServices, esClient }) => {
    // Transforms run with the privileges of the API key they were created with, so a transform
    // created with the viewer's key can't read its source and needs reauthorizing.
    const apiKeys = {} as Record<TransformUser, string>;
    for (const [user, role] of [
      ['manager', testData.TRANSFORM_USERS.transformManager],
      ['viewer', testData.TRANSFORM_USERS.transformViewerUser],
    ] as const) {
      const apiKey = await esClient.security.createApiKey({
        name: `transform_reauthorize_${user}`,
        role_descriptors: { [user]: role.elasticsearch },
      });
      apiKeyIds.push(apiKey.id);
      apiKeys[user] = apiKey.encoded;
    }

    for (const { config, createdBy } of transformsToCreate) {
      await apiServices.transform.createTransformWithSecondaryAuth(
        { ...config, defer_validation: true },
        apiKeys[createdBy]
      );
      // Transforms created with insufficient permissions can't be started.
      await apiServices.transform.startTransform(config.transform_id, { ignoreErrors: true });
    }
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    await esClient.security.invalidateApiKey({ ids: apiKeyIds });
    await apiServices.transform.deleteTransforms(
      transformsToCreate.map(({ config }) => config.transform_id)
    );
    for (const { config } of transformsToCreate) {
      await apiServices.transform.deleteIndices({ index: config.dest.index });
    }
  });

  for (const { title, config, reauthorizedState } of reauthorizedByManagerTestDataList) {
    test(`a manager reauthorizes a ${title}`, async ({ browserAuth, pageObjects }) => {
      const { transformManagement } = pageObjects;
      const transformId = config.transform_id;
      await browserAuth.loginAsTransformManager();
      await transformManagement.goto();

      await test.step('shows the reauthorize callout and the unauthorized transform', async () => {
        await showsReauthorizeCallout(transformManagement, transformId, UNAUTHORIZED_STATE);
      });

      await test.step('reauthorizes the transform', async () => {
        await transformManagement.openRowActions(transformId);
        await expect(transformManagement.getRowAction('Reauthorize')).toBeEnabled();
        await transformManagement.closeRowActions(transformId);
        await transformManagement.clickRowAction(transformId, 'Reauthorize');
        await transformManagement.confirmModal('Reauthorize');
        await assertTransformRow(transformManagement, transformId, reauthorizedState);
      });

      await test.step('no longer offers the reauthorize action', async () => {
        await transformManagement.openRowActions(transformId);
        await expect(transformManagement.getRowAction('Reauthorize')).toBeHidden();
        await transformManagement.closeRowActions(transformId);
      });
    });
  }

  for (const { title, config, state } of viewedByViewerTestDataList) {
    test(`a viewer can't act on a ${title}`, async ({ browserAuth, pageObjects }) => {
      const { transformManagement } = pageObjects;
      const transformId = config.transform_id;
      await browserAuth.loginAsTransformViewer();
      await transformManagement.goto();

      await test.step('shows the reauthorize callout and the transform', async () => {
        await showsReauthorizeCallout(transformManagement, transformId, state);
      });

      await test.step('shows every row action disabled', async () => {
        await transformManagement.openRowActions(transformId);
        for (const action of await transformManagement.rowActions.all()) {
          await expect(action).toBeDisabled();
        }
        await transformManagement.closeRowActions(transformId);
      });
    });
  }
});
