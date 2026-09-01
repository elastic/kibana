/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { ProjectRouting } from '@kbn/es-query';
import type { TransformApiService } from '../../../scout/api/services/transform_api_service';
import { test, testData } from '../fixtures';

const CREATED_TRANSFORM_ID = 'scout_cps_ui_create_project_scope';
const EDITED_TRANSFORM_ID = 'scout_cps_ui_edit_project_scope';
const LINKED_ONLY_TRANSFORM_ID = 'scout_cps_ui_linked_only_project_scope';
const BULK_EDITED_TRANSFORM_IDS = [
  'scout_cps_ui_bulk_edit_project_scope_1',
  'scout_cps_ui_bulk_edit_project_scope_2',
];
const TRANSFORM_IDS = [
  CREATED_TRANSFORM_ID,
  EDITED_TRANSFORM_ID,
  LINKED_ONLY_TRANSFORM_ID,
  ...BULK_EDITED_TRANSFORM_IDS,
];

const LINKED_PROJECT_ROUTING = `_id:${testData.LINKED_PROJECT_ID}`;

const DATA_VIEW_API_PATH = 'api/data_views/data_view';

const getDestinationIndex = (transformId: string) => `user-${transformId}`;

const getTransformConfig = (
  transformId: string,
  projectRouting?: ProjectRouting
): Omit<estypes.TransformPutTransformRequest, 'transform_id'> => ({
  source: {
    index: [testData.DATA_VIEW_TITLE],
    ...(projectRouting ? { project_routing: projectRouting } : {}),
  },
  pivot: {
    group_by: {
      airline: {
        terms: {
          field: 'airline',
        },
      },
    },
    aggregations: {
      timestamp_count: {
        value_count: {
          field: '@timestamp',
        },
      },
    },
  },
  dest: {
    index: getDestinationIndex(transformId),
  },
});

const createDataView = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `${DATA_VIEW_API_PATH}/${testData.DATA_VIEW_ID}`,
    headers: testData.COMMON_HEADERS,
    ignoreErrors: [404],
  });
  await kbnClient.request({
    method: 'POST',
    path: DATA_VIEW_API_PATH,
    headers: testData.COMMON_HEADERS,
    body: {
      data_view: {
        id: testData.DATA_VIEW_ID,
        title: testData.DATA_VIEW_TITLE,
        timeFieldName: testData.DATA_VIEW_TIME_FIELD,
      },
    },
  });
};

const deleteTransformResources = async (
  transformService: TransformApiService,
  transformId: string
): Promise<void> => {
  await transformService.deleteTransform(
    {
      transform_id: transformId,
      force: true,
    },
    { ignoreErrors: true }
  );
  await transformService.deleteIndices({ index: getDestinationIndex(transformId) });
};

const createTransform = async (
  transformService: TransformApiService,
  transformId: string,
  projectRouting?: ProjectRouting
): Promise<void> => {
  await deleteTransformResources(transformService, transformId);
  await transformService.createTransform({
    transform_id: transformId,
    defer_validation: true,
    ...getTransformConfig(transformId, projectRouting),
  });
};

const getProjectRouting = async (
  transformService: TransformApiService,
  transformId: string
): Promise<ProjectRouting | undefined> => {
  const transform = await transformService.getTransform({ transform_id: transformId });
  return transform.source.project_routing;
};

test.describe(
  'Transform CPS project scope UI flows',
  { tag: tags.serverless.security.complete },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await createDataView(kbnClient);
    });

    test.beforeEach(async ({ browserAuth, apiServices }) => {
      for (const transformId of TRANSFORM_IDS) {
        await deleteTransformResources(apiServices.transform, transformId);
      }
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ apiServices }) => {
      for (const transformId of TRANSFORM_IDS) {
        await deleteTransformResources(apiServices.transform, transformId);
      }
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'DELETE',
        path: `${DATA_VIEW_API_PATH}/${testData.DATA_VIEW_ID}`,
        headers: testData.COMMON_HEADERS,
        ignoreErrors: [404],
      });
    });

    test('creates a transform with project scope and verifies the table details', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      const { transform } = pageObjects;

      await test.step('create a transform with only the origin project selected', async () => {
        await transform.gotoCreate(testData.DATA_VIEW_ID);
        await transform.selectCreateProjectScope(testData.ORIGIN_PROJECT_ID, testData.PROJECT_IDS);
        await expect(page.testSubj.locator('transformProjectScopePicker')).toHaveText(
          'This project'
        );
        await transform.useFullData();
        await transform.configureBasicPivot();
        await transform.createTransform(CREATED_TRANSFORM_ID);
      });

      await test.step('verify project routing was saved', async () => {
        await expect
          .poll(() => getProjectRouting(apiServices.transform, CREATED_TRANSFORM_ID))
          .toBe(PROJECT_ROUTING.ORIGIN);
      });

      await test.step('verify the project scope column and expanded details', async () => {
        await transform.returnToManagementFromCreate();
        const row = transform.getTransformRow(CREATED_TRANSFORM_ID);

        await expect(page.testSubj.locator('transformListColumnProjectScope')).toBeVisible();
        await expect(row).toBeVisible();
        await expect(row.getByTestId('transformListProjectScopeButton')).toHaveText('This project');

        await transform.expandTransformRow(CREATED_TRANSFORM_ID);
        await expect(page.testSubj.locator('transformExpandedRowTabbedContent')).toContainText(
          'Project routing'
        );
        await expect(page.testSubj.locator('transformExpandedRowTabbedContent')).toContainText(
          PROJECT_ROUTING.ORIGIN
        );
      });
    });

    test('shows linked-only project scope as a custom subset in the table', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      const { transform } = pageObjects;

      await test.step('set up a transform with only the linked project selected', async () => {
        await createTransform(
          apiServices.transform,
          LINKED_ONLY_TRANSFORM_ID,
          LINKED_PROJECT_ROUTING
        );
      });

      await test.step('verify the linked-only project scope column label', async () => {
        await transform.gotoManagement();
        const row = transform.getTransformRow(LINKED_ONLY_TRANSFORM_ID);

        await expect(page.testSubj.locator('transformListColumnProjectScope')).toBeVisible();
        await expect(row).toBeVisible();
        await expect(row.getByTestId('transformListProjectScopeButton')).toHaveText('1/2');
      });
    });

    test('edits a transform project scope through the Edit action', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      const { transform } = pageObjects;

      await test.step('set up a transform with all projects selected', async () => {
        await createTransform(apiServices.transform, EDITED_TRANSFORM_ID, PROJECT_ROUTING.ALL);
      });

      await test.step('change the project scope from the edit flyout', async () => {
        await transform.gotoManagement();
        const row = transform.getTransformRow(EDITED_TRANSFORM_ID);

        await expect(row).toBeVisible();
        await expect(row.getByTestId('transformListProjectScopeButton')).toHaveText('All');
        await transform.openEditFlyout(EDITED_TRANSFORM_ID);
        await expect(page.testSubj.locator('transformEditProjectScopeButton')).toHaveText(
          'All projects'
        );

        await transform.selectEditProjectScope(testData.ORIGIN_PROJECT_ID, testData.PROJECT_IDS);
        await expect(page.testSubj.locator('transformEditProjectScopeButton')).toHaveText(
          'This project'
        );
        await transform.updateTransform();
      });

      await test.step('verify the updated project routing', async () => {
        await expect
          .poll(() => getProjectRouting(apiServices.transform, EDITED_TRANSFORM_ID))
          .toBe(PROJECT_ROUTING.ORIGIN);
      });
    });

    test('edits multiple transform project scopes from the bulk action', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      const { transform } = pageObjects;

      await test.step('set up transforms with all projects selected', async () => {
        for (const transformId of BULK_EDITED_TRANSFORM_IDS) {
          await createTransform(apiServices.transform, transformId, PROJECT_ROUTING.ALL);
        }
      });

      await test.step('change the project scope from the bulk action', async () => {
        await transform.gotoManagement();

        for (const transformId of BULK_EDITED_TRANSFORM_IDS) {
          await expect(transform.getTransformRow(transformId)).toBeVisible();
        }

        await transform.selectTransformRows(BULK_EDITED_TRANSFORM_IDS);
        await expect(page.testSubj.locator('transformBulkActionsMenuButton')).toHaveText(
          `${BULK_EDITED_TRANSFORM_IDS.length} selected`
        );

        await transform.openBulkProjectScopeFlyout();
        await transform.selectBulkProjectScope(testData.ORIGIN_PROJECT_ID, testData.PROJECT_IDS);

        for (const transformId of BULK_EDITED_TRANSFORM_IDS) {
          await expect(
            page.testSubj.locator('transformBulkProjectScopeModalTransformList')
          ).toContainText(transformId);
        }

        await transform.confirmBulkProjectScopeUpdate();

        await expect(page.testSubj.locator('transformBulkActionsMenuButton')).toBeHidden();
        for (const transformId of BULK_EDITED_TRANSFORM_IDS) {
          await expect(
            transform.getTransformRow(transformId).getByRole('checkbox')
          ).not.toBeChecked();
          await expect(
            transform.getTransformRow(transformId).getByTestId('transformListProjectScopeButton')
          ).toHaveText('This project');
        }
      });

      await test.step('verify the updated project routing for all selected transforms', async () => {
        await expect
          .poll(async () =>
            Promise.all(
              BULK_EDITED_TRANSFORM_IDS.map((transformId) =>
                getProjectRouting(apiServices.transform, transformId)
              )
            )
          )
          .toStrictEqual(BULK_EDITED_TRANSFORM_IDS.map(() => PROJECT_ROUTING.ORIGIN));
      });
    });
  }
);
