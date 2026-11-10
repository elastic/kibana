/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { PageObjects, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { TransformApiService } from '../../../api/services/transform_api_service';
import type { TransformManagementPage, TransformWizardPage } from '../../fixtures/page_objects';
import type { AggregationEntry, GroupByEntry } from '../../fixtures';
import {
  assertAddsAggregations,
  assertAddsGroupByEntries,
  assertCreateStep,
  assertDetailsStep,
  assertNumFailureRetries,
  assertTransformRow,
  POLL_TIMEOUT_MS,
  test,
} from '../../fixtures';

const SAMPLE_DATA_SET = 'ecommerce';
// Name of the data view the sample data set installs.
const SAMPLE_DATA_VIEW = 'Kibana Sample Data eCommerce';
const INDEX_PREVIEW_ROWS = 5;
// Cloud can take a while to finish the first checkpoint of a continuous transform.
const FIRST_CHECKPOINT_TIMEOUT_MS = 60_000;

const pivot = {
  transformId: `ec_pivot_${Date.now()}`,
  description: 'kibana_ecommerce continuous pivot transform',
  groupBy: [
    { identifier: 'terms(category)', label: 'category' },
    { identifier: 'date_histogram(order_date)', label: 'order_date', intervalLabel: '1m' },
  ] as GroupByEntry[],
  aggregations: [
    { identifier: 'avg(products.base_price)', label: 'products.base_price.avg' },
    {
      identifier: 'filter(geoip.city_name)',
      label: 'geoip.city_name.filter',
      form: { filterType: 'term', filterTermValue: 'New York' },
      formOpensOnAdd: true,
      subAggs: [
        { identifier: 'max(products.base_price)', label: 'products.base_price.max' },
        {
          identifier: 'filter(customer_gender)',
          label: 'customer_gender.filter',
          form: { filterType: 'term', filterTermValue: 'FEMALE' },
          formOpensOnAdd: true,
          subAggs: [{ identifier: 'avg(taxful_total_price)', label: 'taxful_total_price.avg' }],
        },
      ],
    },
  ] as AggregationEntry[],
};

const latest = {
  transformId: `ec_latest_${Date.now()}`,
  description: 'kibana_ecommerce continuous with the latest function',
};

const getDestinationIndex = (transformId: string) => `user-${transformId}`;

const fetchDocumentsIndexed = async (transformApi: TransformApiService, transformId: string) =>
  Number(
    (await transformApi.getTransformStats({ transform_id: transformId })).stats.documents_indexed
  );

// Explicit destination mappings for the latest transform, see https://github.com/elastic/elasticsearch/issues/67148
const LATEST_DESTINATION_MAPPINGS: estypes.MappingTypeMapping = {
  properties: {
    customer_id: { type: 'long' },
    day_of_week_i: { type: 'long' },
    order_date: { type: 'date' },
    order_id: { type: 'long' },
    products: {
      properties: {
        _id: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        base_price: { type: 'float' },
        base_unit_price: { type: 'float' },
        created_on: { type: 'date' },
        discount_amount: { type: 'float' },
        discount_percentage: { type: 'float' },
        min_price: { type: 'float' },
        price: { type: 'float' },
        product_id: { type: 'long' },
        product_name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        quantity: { type: 'long' },
        tax_amount: { type: 'float' },
        taxful_price: { type: 'float' },
        taxless_price: { type: 'float' },
        unit_discount_amount: { type: 'float' },
      },
    },
    taxful_total_price: { type: 'float' },
    taxless_total_price: { type: 'float' },
    total_quantity: { type: 'long' },
    total_unique_products: { type: 'long' },
  },
};

const assertSampleDataPreview = async (transformWizard: TransformWizardPage) => {
  await transformWizard.useFullData();
  await expect(async () => {
    expect(await transformWizard.getDataGridRowCount(transformWizard.indexPreview)).toBe(
      INDEX_PREVIEW_ROWS
    );
  }).toPass({ timeout: POLL_TIMEOUT_MS });
  await expect(transformWizard.queryInput).toHaveText('');
  await expect(transformWizard.advancedQueryEditorSwitch).not.toBeChecked();
  await expect(transformWizard.indexPreviewHistogramButton).toHaveAttribute('aria-pressed', 'true');
};

/** Creates and starts the continuous transform; it keeps running, so there's no progress bar. */
const assertRunsContinuousTransform = async (
  transformWizard: TransformWizardPage,
  transformManagement: TransformManagementPage,
  transform: { transformId: string; description: string; type: string }
) => {
  await transformWizard.createTransform();
  await transformWizard.startTransform();
  await expect(transformWizard.errorToast).toBeHidden();
  await transformWizard.returnToManagement();
  await transformManagement.refreshList();
  await transformManagement.filterByTransformId(transform.transformId);
  await assertTransformRow(transformManagement, transform.transformId, {
    description: transform.description,
    type: transform.type,
    status: 'started',
    mode: 'continuous',
    health: 'Healthy',
  });
};

const assertStopsTransform = async (
  transformManagement: TransformManagementPage,
  transformId: string
) => {
  await transformManagement.openRowActions(transformId);
  for (const action of ['Clone', 'Delete', 'Discover', 'Edit', 'Reset', 'Stop'] as const) {
    await expect(transformManagement.getRowAction(action)).toBeVisible();
  }
  await expect(transformManagement.getRowAction('Start')).toBeHidden();
  await expect(transformManagement.getRowAction('Reset')).toBeDisabled();
  await expect(transformManagement.getRowAction('Delete')).toBeDisabled();
  await transformManagement.closeRowActions(transformId);

  await transformManagement.clickRowAction(transformId, 'Stop');
  await assertTransformRow(transformManagement, transformId, { status: 'stopped' });
};

const assertDiscoverHasResults = async (
  page: ScoutPage,
  pageObjects: Pick<PageObjects, 'discover' | 'datePicker'>
) => {
  await pageObjects.discover.waitUntilSearchingHasFinished();
  await expect(page.getByTestId('discoverQueryHits')).toBeVisible();
  await expect.poll(() => pageObjects.discover.getHitCountInt()).toBeGreaterThan(0);
};

const assertResetsAndRestartsTransform = async (
  transformManagement: TransformManagementPage,
  transformId: string,
  getDocumentsIndexed: () => Promise<number>
) => {
  await transformManagement.goto();
  await transformManagement.filterByTransformId(transformId);
  await transformManagement.openRowActions(transformId);
  await expect(transformManagement.getRowAction('Reset')).toBeEnabled();
  await expect(transformManagement.getRowAction('Start')).toBeEnabled();
  await transformManagement.closeRowActions(transformId);

  expect(await getDocumentsIndexed()).toBeGreaterThan(0);
  await transformManagement.clickRowAction(transformId, 'Reset');
  await transformManagement.confirmModal('Reset');
  await assertTransformRow(transformManagement, transformId, { status: 'stopped' });
  await expect.poll(getDocumentsIndexed).toBe(0);

  await transformManagement.clickRowAction(transformId, 'Start');
  await transformManagement.confirmModal('Start');
  await assertTransformRow(transformManagement, transformId, { status: 'started' });
};

test.describe('Create continuous transform', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ apiServices, esClient }) => {
    await apiServices.sampleData.install(SAMPLE_DATA_SET);
    await esClient.indices.create({
      index: getDestinationIndex(latest.transformId),
      mappings: LATEST_DESTINATION_MAPPINGS,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsTransformManager();
    await pageObjects.transformManagement.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.transform.deleteTransforms([pivot.transformId, latest.transformId]);
    for (const { transformId } of [pivot, latest]) {
      await apiServices.transform.deleteIndices({ index: getDestinationIndex(transformId) });
      await apiServices.dataViews.deleteByTitle(getDestinationIndex(transformId));
    }
    await apiServices.sampleData.remove(SAMPLE_DATA_SET);
  });

  test('creates, stops, resets and restarts a continuous pivot transform', async ({
    apiServices,
    page,
    pageObjects,
  }) => {
    const { transformManagement, transformWizard, datePicker } = pageObjects;

    await test.step('configures the pivot on the sample data', async () => {
      await transformManagement.startTransformCreation('pivot');
      await transformManagement.selectSource(SAMPLE_DATA_VIEW);
      await assertSampleDataPreview(transformWizard);
      await assertAddsGroupByEntries(transformWizard, pivot.groupBy);
      await assertAddsAggregations(transformWizard, pivot.aggregations);
      await expect(transformWizard.pivotPreview).toBeVisible();
      await transformWizard.enableAdvancedPivotEditor();
      expect(await transformWizard.getAdvancedPivotEditorGroupByNames()).toStrictEqual(
        pivot.groupBy.map(({ label }) => label)
      );
    });

    await test.step('sets continuous mode in the details step', async () => {
      await assertDetailsStep(transformWizard, {
        transformId: pivot.transformId,
        description: pivot.description,
        destinationIndex: getDestinationIndex(pivot.transformId),
      });
      await transformWizard.setContinuousMode('order_date');
      await expect(transformWizard.continuousModeDateFieldSelect).toHaveValue('order_date');
      await assertNumFailureRetries(transformWizard, '7');
      await assertCreateStep(transformWizard, '7');
    });

    await test.step('runs and stops the transform', async () => {
      await assertRunsContinuousTransform(transformWizard, transformManagement, {
        ...pivot,
        type: 'pivot',
      });
      await expect
        .poll(() => fetchDocumentsIndexed(apiServices.transform, pivot.transformId), {
          timeout: FIRST_CHECKPOINT_TIMEOUT_MS,
        })
        .toBeGreaterThan(0);
      await assertStopsTransform(transformManagement, pivot.transformId);
    });

    await test.step('shows the destination index in Discover', async () => {
      await transformManagement.clickRowAction(pivot.transformId, 'Discover');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      // The date_histogram group gives the destination a time field.
      await datePicker.setCommonlyUsedTime('Last_1 year');
      await assertDiscoverHasResults(page, pageObjects);
    });

    await test.step('resets and restarts the stopped transform', async () => {
      await assertResetsAndRestartsTransform(transformManagement, pivot.transformId, () =>
        fetchDocumentsIndexed(apiServices.transform, pivot.transformId)
      );
    });
  });

  test('creates, stops, resets and restarts a continuous latest transform', async ({
    apiServices,
    page,
    pageObjects,
  }) => {
    const { transformManagement, transformWizard } = pageObjects;

    await test.step('configures the latest function on the sample data', async () => {
      await transformManagement.startTransformCreation('latest');
      await transformManagement.selectSource(SAMPLE_DATA_VIEW);
      await assertSampleDataPreview(transformWizard);
      await transformWizard.addUniqueKey('geoip.country_iso_code');
      await transformWizard.setSortField('order_date');
      await expect(transformWizard.pivotPreview).toBeVisible();
    });

    await test.step('sets continuous mode in the details step', async () => {
      await assertDetailsStep(transformWizard, {
        transformId: latest.transformId,
        description: latest.description,
        destinationIndex: getDestinationIndex(latest.transformId),
      });
      await transformWizard.dataViewTimeFieldSelect.selectOption('order_date');
      await transformWizard.setContinuousMode('order_date');
      await expect(transformWizard.continuousModeDateFieldSelect).toHaveValue('order_date');
      await assertCreateStep(transformWizard);
    });

    await test.step('runs and stops the transform', async () => {
      await assertRunsContinuousTransform(transformWizard, transformManagement, {
        ...latest,
        type: 'latest',
      });
      await expect
        .poll(() => fetchDocumentsIndexed(apiServices.transform, latest.transformId), {
          timeout: FIRST_CHECKPOINT_TIMEOUT_MS,
        })
        .toBeGreaterThan(0);
      await assertStopsTransform(transformManagement, latest.transformId);
    });

    await test.step('shows the destination index in Discover', async () => {
      await transformManagement.clickRowAction(latest.transformId, 'Discover');
      await assertDiscoverHasResults(page, pageObjects);
    });

    await test.step('resets and restarts the stopped transform', async () => {
      await assertResetsAndRestartsTransform(transformManagement, latest.transformId, () =>
        fetchDocumentsIndexed(apiServices.transform, latest.transformId)
      );
    });
  });
});
