/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, PageObjects } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { TransformManagementPage, TransformWizardPage } from '../../fixtures/page_objects';
import {
  assertAddsAggregations,
  assertAddsGroupByEntries,
  assertCreateStep,
  assertDetailsStep,
  assertRunsBatchTransform,
  assertTransformRow,
  POLL_TIMEOUT_MS,
  test,
  testData,
} from '../../fixtures';

const SAVED_SEARCH_ID = 'scout-ft-farequote-filter';

const pivot = {
  transformId: `fq_1_${Date.now()}`,
  description:
    'farequote batch transform with groups terms(airline) and aggregation avg(responsetime.avg) with saved search filter',
};
const latest = {
  transformId: `fq_2_${Date.now()}`,
  description:
    'farequote batch transform with airline unique key and sort by timestamp with saved search filter',
};
const destinationIndexes = [`user-${pivot.transformId}`, `user-latest-${latest.transformId}`];

/** Discover session `ft_farequote_filter`: the farequote data view filtered to airline ASA. */
const createFilteredSavedSearch = async (kbnClient: KbnClient) => {
  const dataViewId = testData.DATA_VIEWS.FAREQUOTE.id;
  const searchSourceJSON = JSON.stringify({
    highlightAll: true,
    version: true,
    query: { query: '', language: 'lucene' },
    filter: [
      {
        meta: {
          index: dataViewId,
          negate: false,
          disabled: false,
          alias: null,
          type: 'phrase',
          key: 'airline',
          value: 'ASA',
          params: { query: 'ASA', type: 'phrase' },
        },
        query: { match: { airline: { query: 'ASA', type: 'phrase' } } },
        $state: { store: 'appState' },
      },
    ],
    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
  });
  await kbnClient.savedObjects.create({
    type: 'search',
    id: SAVED_SEARCH_ID,
    overwrite: true,
    attributes: {
      title: 'ft_farequote_filter',
      description: '',
      tabs: [
        {
          id: 'tab_0',
          label: 'My Tab',
          attributes: {
            columns: ['_source'],
            sort: ['@timestamp', 'desc'],
            kibanaSavedObjectMeta: { searchSourceJSON },
          },
        },
      ],
    },
    references: [
      {
        id: dataViewId,
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  });
};

/** The saved search filter limits the source to ASA and replaces the query bar. */
const assertFilteredSourcePreview = async (
  transformWizard: TransformWizardPage,
  datePicker: PageObjects['datePicker']
) => {
  await datePicker.setCommonlyUsedTime('Last_15 minutes');
  await expect(transformWizard.indexPreviewEmpty).toBeVisible();
  await transformWizard.useFullData();
  await expect(async () => {
    const airlines = await transformWizard.getDataGridColumnValues(
      transformWizard.indexPreview,
      'airline'
    );
    expect([...new Set(airlines)]).toStrictEqual(['ASA']);
  }).toPass({ timeout: POLL_TIMEOUT_MS });
  await expect(transformWizard.transformPreviewEmpty).toBeVisible();
  await expect(transformWizard.queryInput).toBeHidden();
  await expect(transformWizard.advancedQueryEditorSwitch).toBeHidden();
};

const assertPreviewColumnValues = async (
  transformWizard: TransformWizardPage,
  columnId: string,
  values: string[]
) => {
  await expect(transformWizard.pivotPreview).toBeVisible();
  await expect(async () => {
    const columnValues = await transformWizard.getDataGridColumnValues(
      transformWizard.pivotPreview,
      columnId
    );
    expect([...new Set(columnValues)].sort()).toStrictEqual(values);
  }).toPass({ timeout: POLL_TIMEOUT_MS });
};

const assertCreatedTransform = async (
  transformWizard: TransformWizardPage,
  transformManagement: TransformManagementPage,
  transform: { transformId: string; description: string; type: string }
) => {
  await assertRunsBatchTransform(transformWizard);
  await transformWizard.returnToManagement();
  await transformManagement.refreshList();
  await transformManagement.filterByTransformId(transform.transformId);
  await assertTransformRow(transformManagement, transform.transformId, {
    description: transform.description,
    type: transform.type,
    status: 'stopped',
    mode: 'batch',
    progress: 100,
    health: 'Healthy',
  });
  await transformManagement.expandRow(transform.transformId);
  for (const tab of ['Details', 'Json', 'Health', 'Messages', 'Preview'] as const) {
    await transformManagement.openExpandedRowTab(tab);
    await expect(transformManagement.getExpandedRowTabContent(tab)).toBeVisible();
  }
};

test.describe('Create transform from a saved search', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await createFilteredSavedSearch(kbnClient);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsTransformManager();
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    await apiServices.transform.deleteTransforms([pivot.transformId, latest.transformId]);
    for (const index of destinationIndexes) {
      await apiServices.transform.deleteIndices({ index });
      await apiServices.dataViews.deleteByTitle(index);
    }
    await kbnClient.savedObjects.delete({ type: 'search', id: SAVED_SEARCH_ID });
  });

  test('creates a pivot transform from the filtered saved search', async ({ pageObjects }) => {
    const { transformManagement, transformWizard, datePicker } = pageObjects;

    await test.step('opens the wizard from the saved search deep link', async () => {
      await transformManagement.gotoCreateTransform(SAVED_SEARCH_ID, 'pivot');
      await expect(transformWizard.defineStep).toBeVisible();
      await expect(transformWizard.groupBySelection).toBeVisible();
      await assertFilteredSourcePreview(transformWizard, datePicker);
    });

    await test.step('configures the pivot', async () => {
      await assertAddsGroupByEntries(transformWizard, [
        { identifier: 'terms(airline)', label: 'airline' },
      ]);
      await assertAddsAggregations(transformWizard, [
        { identifier: 'avg(responsetime)', label: 'responsetime.avg' },
      ]);
      await expect(transformWizard.advancedPivotEditorSwitch).not.toBeChecked();
      await assertPreviewColumnValues(transformWizard, 'airline', ['ASA']);
    });

    await test.step('creates and runs the transform', async () => {
      await assertDetailsStep(transformWizard, {
        ...pivot,
        destinationIndex: destinationIndexes[0],
      });
      await expect(transformWizard.continuousModeSwitch).not.toBeChecked();
      await assertCreateStep(transformWizard);
      await assertCreatedTransform(transformWizard, transformManagement, {
        ...pivot,
        type: 'pivot',
      });
    });
  });

  test('creates a latest transform from the filtered saved search', async ({ pageObjects }) => {
    const { transformManagement, transformWizard, datePicker } = pageObjects;

    await test.step('opens the wizard from the saved search deep link', async () => {
      await transformManagement.gotoCreateTransform(SAVED_SEARCH_ID, 'latest');
      await expect(transformWizard.defineStep).toBeVisible();
      await expect(transformWizard.uniqueKeysSelection).toBeVisible();
      await assertFilteredSourcePreview(transformWizard, datePicker);
    });

    await test.step('configures the latest function', async () => {
      await transformWizard.addUniqueKey('airline');
      await transformWizard.setSortField('@timestamp');
      await assertPreviewColumnValues(transformWizard, '@timestamp', [
        'February 11th 2016, 23:59:54',
      ]);
    });

    await test.step('creates and runs the transform', async () => {
      await assertDetailsStep(transformWizard, {
        ...latest,
        destinationIndex: destinationIndexes[1],
      });
      await expect(transformWizard.continuousModeSwitch).not.toBeChecked();
      await assertCreateStep(transformWizard);
      await assertCreatedTransform(transformWizard, transformManagement, {
        ...latest,
        type: 'latest',
      });
    });
  });
});
