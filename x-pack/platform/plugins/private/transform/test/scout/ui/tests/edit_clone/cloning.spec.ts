/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { PageObjects } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { TransformManagementPage, TransformWizardPage } from '../../fixtures/page_objects';
import type { TransformRequest } from '../../fixtures';
import {
  assertCreateStep,
  assertRunsBatchTransform,
  getLatestTransformConfig,
  POLL_TIMEOUT_MS,
  test,
} from '../../fixtures';

const INDEX_PREVIEW_ROWS = 5;

type ClonedPivotRequest = TransformRequest & {
  settings: { max_page_search_size: number; num_failure_retries: number };
};

const getPivotConfig = (): ClonedPivotRequest => {
  const transformId = `ec_cloning_1_${Date.now()}`;
  return {
    transform_id: transformId,
    source: { index: ['ft_ecommerce'] },
    pivot: {
      group_by: { category: { terms: { field: 'category.keyword' } } },
      aggregations: {
        'products.base_price.avg': { avg: { field: 'products.base_price' } },
        'order_date.max': { max: { field: 'order_date' } },
      },
    },
    description:
      'ecommerce batch transform with avg(products.base_price) grouped by terms(category)',
    frequency: '3s',
    retention_policy: { time: { field: 'order_date.max', max_age: '1d' } },
    settings: { max_page_search_size: 250, num_failure_retries: 0 },
    dest: { index: `user-${transformId}` },
  };
};

const getRuntimeMappingsConfig = (): ClonedPivotRequest => {
  const transformId = `ec_cloning_runtime_${Date.now()}`;
  return {
    transform_id: transformId,
    source: {
      index: ['ft_ecommerce'],
      runtime_mappings: {
        rt_gender_lower: {
          type: 'keyword',
          script: "emit(doc['customer_gender'].value.toLowerCase())",
        },
        rt_total_charge: {
          type: 'double',
          script: { source: "emit(doc['taxful_total_price'].value + 4.00)" },
        },
      },
    },
    pivot: {
      group_by: { rt_gender_lower: { terms: { field: 'rt_gender_lower' } } },
      aggregations: {
        'rt_total_charge.avg': { avg: { field: 'rt_total_charge' } },
        'rt_total_charge.min': { min: { field: 'rt_total_charge' } },
        'rt_total_charge.max': { max: { field: 'rt_total_charge' } },
        max_order_date: { max: { field: 'order_date' } },
      },
    },
    description: 'ecommerce batch transform grouped by terms(rt_gender_lower)',
    frequency: '3s',
    retention_policy: { time: { field: 'max_order_date', max_age: '3d' } },
    settings: { max_page_search_size: 250, num_failure_retries: 5 },
    dest: { index: `user-${transformId}` },
  };
};

const getFilterAggConfig = (): ClonedPivotRequest => {
  const transformId = `ec_cloning_filter_agg_${Date.now()}`;
  return {
    transform_id: transformId,
    source: { index: ['ft_ecommerce'] },
    pivot: {
      group_by: { category: { terms: { field: 'category.keyword' } } },
      aggregations: {
        'products.base_price.avg': { avg: { field: 'products.base_price' } },
        Saturday: {
          filter: { term: { day_of_week: 'Saturday' } },
          aggs: { 'saturday.products.base_price.max': { max: { field: 'products.base_price' } } },
        },
        FEMALE: {
          filter: { bool: { must: [], must_not: [], should: [] } },
          aggs: { 'female.products.base_price.sum': { sum: { field: 'products.base_price' } } },
        },
        user_exists: {
          filter: { exists: { field: 'user' } },
          aggs: { 'user_exists.order_date.min': { min: { field: 'order_date' } } },
        },
        max_order_date: { max: { field: 'order_date' } },
      },
    },
    description: 'ecommerce batch transform with filter aggregations',
    frequency: '3s',
    retention_policy: { time: { field: 'max_order_date', max_age: '3d' } },
    settings: { max_page_search_size: 250, num_failure_retries: 5 },
    dest: { index: `user-${transformId}` },
  };
};

const CATEGORY_VALUES = [
  `Men's Accessories`,
  `Men's Clothing`,
  `Men's Shoes`,
  `Women's Accessories`,
  `Women's Clothing`,
];

const pivotTestDataList = [
  {
    title: 'transform with pivot configuration',
    config: getPivotConfig(),
    cloneDescription: 'a cloned transform',
    runtimeMappingFields: [] as string[],
    groupByLabel: 'category',
    aggLabel: 'products.base_price.avg',
    editableAggregations: [] as string[],
    previewValues: CATEGORY_VALUES,
    retentionPolicyField: 'order_date.max',
    retentionPolicyMaxAge: '1d',
  },
  {
    title: 'transform with runtime mappings',
    config: getRuntimeMappingsConfig(),
    cloneDescription: 'a cloned transform with runtime mappings',
    runtimeMappingFields: ['rt_gender_lower', 'rt_total_charge'],
    groupByLabel: 'rt_gender_lower',
    aggLabel: 'rt_total_charge.avg',
    editableAggregations: [] as string[],
    previewValues: ['female', 'male'],
    retentionPolicyField: 'max_order_date',
    retentionPolicyMaxAge: '3d',
  },
  {
    title: 'transform with filter aggregations',
    config: getFilterAggConfig(),
    cloneDescription: 'a cloned transform with filter agg',
    runtimeMappingFields: [] as string[],
    groupByLabel: 'category',
    aggLabel: 'products.base_price.avg',
    editableAggregations: [
      'products.base_price.avg',
      // term filter
      'Saturday',
      'saturday.products.base_price.max',
      // boolean filter
      'FEMALE',
      'female.products.base_price.sum',
      // exists filter
      'user_exists',
      'user_exists.order_date.min',
    ],
    previewValues: CATEGORY_VALUES,
    retentionPolicyField: 'max_order_date',
    retentionPolicyMaxAge: '3d',
  },
];

const latestConfig = getLatestTransformConfig('cloning');
const allConfigs = [...pivotTestDataList.map(({ config }) => config), latestConfig];
const getCloneId = (config: TransformRequest) => `clone_${config.transform_id}`;

const openCloneWizard = async (
  transformManagement: TransformManagementPage,
  transformId: string
) => {
  await transformManagement.filterByTransformId(transformId);
  await transformManagement.clickRowAction(transformId, 'Clone');
};

const assertSourcePreview = async (
  transformWizard: TransformWizardPage,
  datePicker: PageObjects['datePicker']
) => {
  await datePicker.setCommonlyUsedTime('Last_15 minutes');
  await expect(transformWizard.indexPreviewEmpty).toBeVisible();
  await transformWizard.useFullData();
  await expect(async () => {
    expect(await transformWizard.getDataGridRowCount(transformWizard.indexPreview)).toBe(
      INDEX_PREVIEW_ROWS
    );
  }).toPass({ timeout: POLL_TIMEOUT_MS });
  await expect(transformWizard.queryInput).toBeVisible();
  await expect(transformWizard.queryInput).toHaveText('');
};

const assertPivotPreviewValues = async (
  transformWizard: TransformWizardPage,
  columnId: string,
  values: string[]
) => {
  await expect(transformWizard.pivotPreviewHistogramButton).toBeHidden();
  await expect(async () => {
    const columnValues = await transformWizard.getDataGridColumnValues(
      transformWizard.pivotPreview,
      columnId
    );
    expect([...new Set(columnValues)].sort()).toStrictEqual(values);
  }).toPass({ timeout: POLL_TIMEOUT_MS });
};

const assertCloneDetails = async (
  transformWizard: TransformWizardPage,
  config: TransformRequest,
  cloneDescription: string
) => {
  const cloneId = getCloneId(config);
  await transformWizard.advanceToDetailsStep();

  await expect(transformWizard.transformIdInput).toHaveValue('');
  await transformWizard.transformIdInput.fill(cloneId);
  await expect(transformWizard.descriptionInput).toHaveValue(config.description);
  await transformWizard.descriptionInput.fill(cloneDescription);

  await expect(transformWizard.destIndexSameAsIdSwitch).toBeChecked();
  await transformWizard.destIndexSameAsIdSwitch.click();
  await expect(transformWizard.destinationIndexInput).toHaveValue(cloneId);
  await transformWizard.destinationIndexInput.fill(`user-${cloneId}`);

  await expect(transformWizard.createDataViewSwitch).toBeChecked();
  await expect(transformWizard.continuousModeSwitch).not.toBeChecked();
};

const assertRunsClone = async (
  transformWizard: TransformWizardPage,
  transformManagement: TransformManagementPage,
  config: TransformRequest
) => {
  await assertRunsBatchTransform(transformWizard);
  await transformWizard.returnToManagement();
  await transformManagement.refreshList();
  await transformManagement.filterByTransformId(getCloneId(config));
  await expect(transformManagement.getRow(getCloneId(config))).toBeVisible();
};

test.describe('Clone transform', { tag: tags.deploymentAgnostic }, () => {
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
    await apiServices.transform.deleteTransforms(
      allConfigs.flatMap((config) => [config.transform_id, getCloneId(config)])
    );
    for (const config of allConfigs) {
      await apiServices.transform.deleteIndices({ index: config.dest.index });
      await apiServices.transform.deleteIndices({ index: `user-${getCloneId(config)}` });
      await apiServices.dataViews.deleteByTitle(`user-${getCloneId(config)}`);
    }
  });

  for (const testData of pivotTestDataList) {
    const { config } = testData;

    test(`clones a ${testData.title}`, async ({ pageObjects }) => {
      const { transformManagement, transformWizard, datePicker } = pageObjects;

      await test.step('opens the existing transform in the wizard', async () => {
        await openCloneWizard(transformManagement, config.transform_id);
        await expect(transformWizard.groupBySelection).toBeVisible();
        await expect(transformWizard.defineStep).toBeVisible();
      });

      await test.step('shows the pre-filled define step', async () => {
        await expect(transformWizard.runtimeMappingsSwitch).not.toBeChecked();
        await transformWizard.enableRuntimeMappingsEditor();
        expect(await transformWizard.getRuntimeMappingsEditorFieldNames()).toStrictEqual(
          testData.runtimeMappingFields
        );

        await assertSourcePreview(transformWizard, datePicker);

        const [groupByLabel] = await transformWizard.getGroupByEntryLabels();
        expect(groupByLabel).toBe(testData.groupByLabel);
        const [aggLabel] = await transformWizard.getAggregationEntryLabels();
        expect(aggLabel).toBe(testData.aggLabel);
        for (const aggName of testData.editableAggregations) {
          await transformWizard.openAggregationEditPopover(aggName);
          await expect(transformWizard.getAggregationApplyButton(aggName)).toBeEnabled();
          await transformWizard.closeAggregationEditPopover(aggName);
        }

        await assertPivotPreviewValues(
          transformWizard,
          testData.groupByLabel,
          testData.previewValues
        );
      });

      await test.step('shows the pre-filled details step', async () => {
        await assertCloneDetails(transformWizard, config, testData.cloneDescription);

        await expect(transformWizard.retentionPolicySwitch).toBeChecked();
        await expect(transformWizard.retentionPolicyFieldSelect).toHaveValue(
          testData.retentionPolicyField
        );
        await expect(transformWizard.retentionPolicyMaxAgeInput).toHaveValue(
          testData.retentionPolicyMaxAge
        );

        await assertCreateStep(transformWizard, String(config.settings.num_failure_retries));
      });

      await test.step('runs the clone and shows it in the list', async () => {
        await assertRunsClone(transformWizard, transformManagement, config);
      });
    });
  }

  test('clones a transform with latest configuration', async ({ pageObjects }) => {
    const { transformManagement, transformWizard, datePicker } = pageObjects;

    await test.step('opens the existing transform in the wizard', async () => {
      await openCloneWizard(transformManagement, latestConfig.transform_id);
      await expect(transformWizard.uniqueKeysSelection).toBeVisible();
      await expect(transformWizard.defineStep).toBeVisible();
    });

    await test.step('shows the pre-filled define step', async () => {
      await expect(transformWizard.runtimeMappingsSwitch).not.toBeChecked();
      await assertSourcePreview(transformWizard, datePicker);

      expect(await transformWizard.getUniqueKeys()).toStrictEqual(latestConfig.latest.unique_key);
      await expect(transformWizard.getSortFieldInput()).toHaveValue(latestConfig.latest.sort);

      await assertPivotPreviewValues(transformWizard, 'order_date', [
        'July 12th 2023, 23:06:43',
        'July 12th 2023, 23:31:12',
        'July 12th 2023, 23:45:36',
      ]);
    });

    await test.step('shows the pre-filled details step', async () => {
      await assertCloneDetails(transformWizard, latestConfig, 'a cloned transform');
      await expect(transformWizard.retentionPolicySwitch).not.toBeChecked();
      await assertCreateStep(transformWizard);
    });

    await test.step('runs the clone and shows it in the list', async () => {
      await assertRunsClone(transformWizard, transformManagement, latestConfig);
    });
  });
});
