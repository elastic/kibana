/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { TransformWizardPage } from '../../fixtures/page_objects';
import type { HistogramChart } from '../../fixtures';
import {
  assertAddsAggregations,
  assertAddsGroupByEntries,
  assertCreateStep,
  assertDetailsStep,
  assertHistogramCharts,
  assertRunsBatchTransform,
  POLL_TIMEOUT_MS,
  test,
  testData,
} from '../../fixtures';

const RUNTIME_MAPPINGS = {
  rt_airline_lower: {
    type: 'keyword',
    script: 'emit(params._source.airline.toLowerCase())',
  },
  rt_responsetime_x_2: {
    type: 'double',
    script: "emit(doc['responsetime'].value * 2.0)",
  },
};

// Sampled charts vary between runs, so only their labels are asserted.
const HISTOGRAM_CHARTS: HistogramChart[] = [
  { id: '@timestamp' },
  { id: '@version', legend: '1 category' },
  { id: 'airline', legend: '19 categories' },
  { id: 'responsetime' },
  { id: 'rt_airline_lower', legend: '19 categories' },
  { id: 'rt_responsetime_x_2' },
  { id: 'type', legend: '1 category' },
];

const INDEX_PREVIEW_ROWS = 5;

const pivot = {
  transformId: `ec_1_${Date.now()}`,
  description: 'ecommerce batch transform with group by terms(rt_airline_lower)',
};
const latest = {
  transformId: `fq_2_${Date.now()}`,
  description: 'batch transform with unique rt_airline_lower and sort by time',
};
const destinationIndexes = [`user-${pivot.transformId}`, `user-latest-${latest.transformId}`];

/** Applies the runtime mappings and checks the source preview shows the runtime fields. */
const assertRuntimeMappingsSourcePreview = async (
  transformWizard: TransformWizardPage,
  datePicker: PageObjects['datePicker'],
  runtimeFieldColumns: string[]
) => {
  await datePicker.setCommonlyUsedTime('Last_15 minutes');
  await expect(transformWizard.runtimeMappingsSwitch).not.toBeChecked();
  await transformWizard.enableRuntimeMappingsEditor();
  expect(await transformWizard.getRuntimeMappingsEditorValue()).toBe('');
  await transformWizard.setRuntimeMappings(JSON.stringify(RUNTIME_MAPPINGS));
  await expect(transformWizard.indexPreviewEmpty).toBeVisible();

  await transformWizard.useFullData();
  await expect(async () => {
    expect(await transformWizard.getDataGridRowCount(transformWizard.indexPreview)).toBe(
      INDEX_PREVIEW_ROWS
    );
    for (const column of runtimeFieldColumns) {
      const values = await transformWizard.getDataGridColumnValues(
        transformWizard.indexPreview,
        column
      );
      expect(values).not.toContain('');
    }
  }).toPass({ timeout: POLL_TIMEOUT_MS });

  await expect(transformWizard.transformPreviewEmpty).toBeVisible();
  await expect(transformWizard.queryInput).toHaveText('');
  await expect(transformWizard.advancedQueryEditorSwitch).not.toBeChecked();
  await expect(transformWizard.indexPreviewHistogramButton).toHaveAttribute('aria-pressed', 'true');
  await assertHistogramCharts(transformWizard, HISTOGRAM_CHARTS);
};

const assertDiscoverHasFields = async (
  page: ScoutPage,
  pageObjects: Pick<PageObjects, 'discover'>,
  fields: string[]
) => {
  for (const field of fields) {
    await pageObjects.discover.searchFieldInSidebar(field);
    await expect(page.getByTestId(`field-${field}`)).toBeVisible();
  }
};

test.describe('Create transform with runtime mappings', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsTransformManager();
    await pageObjects.transformManagement.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.transform.deleteTransforms([pivot.transformId, latest.transformId]);
    for (const index of destinationIndexes) {
      await apiServices.transform.deleteIndices({ index });
      await apiServices.dataViews.deleteByTitle(index);
    }
  });

  test('creates a pivot transform grouped by a runtime field', async ({ page, pageObjects }) => {
    const { transformManagement, transformWizard, datePicker } = pageObjects;

    await test.step('applies runtime mappings to the source', async () => {
      await transformManagement.startTransformCreation('pivot');
      await transformManagement.selectSource(testData.DATA_VIEWS.FAREQUOTE.title);
      await assertRuntimeMappingsSourcePreview(transformWizard, datePicker, [
        'rt_airline_lower',
        'rt_responsetime_x_2',
      ]);
    });

    await test.step('configures the pivot on the runtime fields', async () => {
      await assertAddsGroupByEntries(transformWizard, [
        { identifier: 'terms(rt_airline_lower)', label: 'rt_airline_lower' },
      ]);
      await assertAddsAggregations(transformWizard, [
        { identifier: 'max(rt_responsetime_x_2)', label: 'rt_responsetime_x_2.max' },
        { identifier: 'min(rt_responsetime_x_2)', label: 'rt_responsetime_x_2.min' },
        { identifier: 'avg(rt_responsetime_x_2)', label: 'rt_responsetime_x_2.avg' },
      ]);
      await transformWizard.enableAdvancedPivotEditor();
      expect(await transformWizard.getAdvancedPivotEditorGroupByNames()).toStrictEqual([
        'rt_airline_lower',
      ]);

      await expect(transformWizard.pivotPreview).toBeVisible();
      await expect(transformWizard.pivotPreviewHistogramButton).toBeHidden();
      await expect(async () => {
        for (const column of [
          'rt_airline_lower',
          'rt_responsetime_x_2.avg',
          'rt_responsetime_x_2.max',
          'rt_responsetime_x_2.min',
        ]) {
          const values = await transformWizard.getDataGridColumnValues(
            transformWizard.pivotPreview,
            column
          );
          expect(values).not.toContain('');
        }
      }).toPass({ timeout: POLL_TIMEOUT_MS });
    });

    await test.step('creates and runs the transform', async () => {
      await assertDetailsStep(transformWizard, {
        ...pivot,
        destinationIndex: destinationIndexes[0],
      });
      await expect(transformWizard.continuousModeSwitch).not.toBeChecked();
      await assertCreateStep(transformWizard);
      await assertRunsBatchTransform(transformWizard);
    });

    await test.step('shows the runtime fields in Discover', async () => {
      await transformWizard.redirectToDiscover();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await assertDiscoverHasFields(page, pageObjects, [
        'rt_responsetime_x_2.avg',
        'rt_responsetime_x_2.max',
        'rt_responsetime_x_2.min',
      ]);
    });
  });

  test('creates a latest transform with a runtime field as unique key', async ({
    page,
    pageObjects,
  }) => {
    const { transformManagement, transformWizard, datePicker } = pageObjects;

    await test.step('applies runtime mappings to the source', async () => {
      await transformManagement.startTransformCreation('latest');
      await transformManagement.selectSource(testData.DATA_VIEWS.FAREQUOTE.title);
      await assertRuntimeMappingsSourcePreview(transformWizard, datePicker, [
        'airline',
        'rt_airline_lower',
        'rt_responsetime_x_2',
      ]);
    });

    await test.step('configures the latest function on the runtime field', async () => {
      await transformWizard.addUniqueKey('rt_airline_lower');
      await transformWizard.setSortField('@timestamp');
      await expect(transformWizard.pivotPreview).toBeVisible();
      await expect(transformWizard.pivotPreviewHistogramButton).toBeHidden();
    });

    await test.step('creates and runs the transform', async () => {
      await assertDetailsStep(transformWizard, {
        ...latest,
        destinationIndex: destinationIndexes[1],
      });
      await expect(transformWizard.continuousModeSwitch).not.toBeChecked();
      await assertCreateStep(transformWizard);
      await assertRunsBatchTransform(transformWizard);
    });

    await test.step('shows the runtime fields in Discover', async () => {
      // The destination data view has no time field, so Discover shows all documents.
      await transformWizard.redirectToDiscover();
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await assertDiscoverHasFields(page, pageObjects, ['rt_airline_lower', 'rt_responsetime_x_2']);
    });
  });
});
