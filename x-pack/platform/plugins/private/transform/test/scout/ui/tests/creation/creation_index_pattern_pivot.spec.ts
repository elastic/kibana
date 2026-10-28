/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { AggregationEntry, GroupByEntry, HistogramChart } from '../../fixtures';
import {
  assertAddsAggregations,
  assertAddsGroupByEntries,
  assertCreateStep,
  assertDetailsStep,
  assertDiscoverHits,
  assertFieldStatsFlyout,
  assertHistogramCharts,
  assertNoA11yViolations,
  assertNumFailureRetries,
  assertRunsBatchTransform,
  assertSourcePreview,
  assertStoppedTransformRowActions,
  assertTransformRow,
  test,
  testData,
} from '../../fixtures';

const FULL_TIME_RANGE = {
  start: '2023-06-12T00:04:19.000Z',
  end: '2023-07-12T23:45:36.000Z',
};

interface PivotTestData {
  title: string;
  transformId: string;
  description: string;
  groupBy: GroupByEntry[];
  aggregations: AggregationEntry[];
  groupByFieldStats: Array<{ fieldName: string; part: 'topValues' | 'histogram' }>;
  aggFieldStats: Array<{ fieldName: string; part: 'topValues' | 'histogram' }>;
  histogramCharts: HistogramChart[];
  numFailureRetries: string;
  destinationHasTimeField: boolean;
  discoverHits: string;
}

const testDataList: PivotTestData[] = [
  {
    title: 'batch transform with terms+date_histogram groups and avg agg',
    transformId: `ec_1_${Date.now()}`,
    description:
      'ecommerce batch transform with groups terms(category) + date_histogram(order_date) 1m and aggregation avg(products.base_price)',
    groupBy: [
      { identifier: 'terms(category)', label: 'category' },
      { identifier: 'date_histogram(order_date)', label: 'order_date', intervalLabel: '1m' },
    ],
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
    ],
    groupByFieldStats: [{ fieldName: 'customer_gender', part: 'topValues' }],
    aggFieldStats: [
      { fieldName: 'category.keyword', part: 'topValues' },
      { fieldName: 'currency', part: 'topValues' },
    ],
    histogramCharts: [
      { id: 'category', legend: '6 categories' },
      { id: 'customer_first_name', legend: 'top 20 of 46 categories' },
      { id: 'day_of_week_i', legend: '0 - 6' },
    ],
    numFailureRetries: '7',
    destinationHasTimeField: true,
    discoverHits: '7,270',
  },
  {
    title: 'batch transform with terms group and percentiles agg',
    transformId: `ec_2_${Date.now()}`,
    description:
      'ecommerce batch transform with group by terms(geoip.country_iso_code) and aggregation percentiles(products.base_price)',
    groupBy: [{ identifier: 'terms(geoip.country_iso_code)', label: 'geoip.country_iso_code' }],
    aggregations: [
      {
        identifier: 'percentiles(products.base_price)',
        label: 'products.base_price.percentiles',
        // The default percents are valid, so the form doesn't open on its own.
        form: { percents: [1, 25, 50, 75, 100] },
        formOpensOnAdd: false,
      },
      {
        identifier: 'filter(customer_phone)',
        label: 'customer_phone.filter',
        form: { filterType: 'exists' },
        formOpensOnAdd: true,
        subAggs: [
          { identifier: 'max(products.discount_amount)', label: 'products.discount_amount.max' },
        ],
      },
    ],
    groupByFieldStats: [],
    aggFieldStats: [],
    histogramCharts: [],
    numFailureRetries: '-1',
    destinationHasTimeField: false,
    discoverHits: '10',
  },
  {
    title: 'batch transform with terms group and terms agg',
    transformId: `ec_3_${Date.now()}`,
    description:
      'ecommerce batch transform with group by terms(customer_gender) and aggregation terms(geoip.city_name)',
    groupBy: [{ identifier: 'terms(customer_gender)', label: 'customer_gender' }],
    aggregations: [{ identifier: 'terms(geoip.city_name)', label: 'geoip.city_name.terms' }],
    groupByFieldStats: [],
    aggFieldStats: [],
    histogramCharts: [],
    numFailureRetries: '0',
    destinationHasTimeField: false,
    discoverHits: '2',
  },
];

const getDestinationIndex = (transformId: string) => `user-${transformId}`;

test.describe('Create pivot transform from a data view', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsTransformManager();
    await pageObjects.transformManagement.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.transform.deleteTransforms(testDataList.map((d) => d.transformId));
    for (const { transformId } of testDataList) {
      await apiServices.transform.deleteIndices({ index: getDestinationIndex(transformId) });
      await apiServices.dataViews.deleteByTitle(getDestinationIndex(transformId));
    }
  });

  for (const data of testDataList) {
    test(`creates a ${data.title}`, async ({ config, page, pageObjects }) => {
      const { transformManagement, transformWizard, datePicker } = pageObjects;
      const destinationIndex = getDestinationIndex(data.transformId);

      await test.step('opens the wizard for the source data view', async () => {
        await expect(transformManagement.statsBar).toBeVisible();
        await transformManagement.startTransformCreation('pivot');
        await transformManagement.selectSource(testData.DATA_VIEWS.ECOMMERCE.title);
        await expect(transformWizard.defineStep).toBeVisible();
        await expect(transformWizard.groupBySelection).toBeVisible();
      });

      await test.step('loads the source preview', async () => {
        await assertSourcePreview(transformWizard, datePicker, {
          isServerless: config.serverless,
          fullTimeRange: FULL_TIME_RANGE,
        });
        await assertHistogramCharts(transformWizard, data.histogramCharts);
        await assertNoA11yViolations(page);
      });

      await test.step('configures the group by and aggregations', async () => {
        for (const { fieldName, part } of data.groupByFieldStats) {
          await assertFieldStatsFlyout(
            transformWizard,
            'transformGroupBySelection',
            fieldName,
            part
          );
        }
        await assertAddsGroupByEntries(transformWizard, data.groupBy);

        for (const { fieldName, part } of data.aggFieldStats) {
          await assertFieldStatsFlyout(
            transformWizard,
            'transformAggregationSelection',
            fieldName,
            part
          );
        }
        await assertAddsAggregations(transformWizard, data.aggregations);

        await expect(transformWizard.pivotPreview).toBeVisible();
        await expect(transformWizard.pivotPreviewHistogramButton).toBeHidden();
        await assertNoA11yViolations(page);
      });

      await test.step('shows the configuration in the advanced pivot editor', async () => {
        await expect(transformWizard.advancedPivotEditorSwitch).not.toBeChecked();
        await transformWizard.enableAdvancedPivotEditor();
        expect(await transformWizard.getAdvancedPivotEditorGroupByNames()).toStrictEqual(
          data.groupBy.map(({ label }) => label)
        );
        await assertNoA11yViolations(page);
      });

      await test.step('fills the details step', async () => {
        await assertDetailsStep(transformWizard, {
          transformId: data.transformId,
          description: data.description,
          destinationIndex,
        });
        await expect(transformWizard.continuousModeSwitch).not.toBeChecked();
        await assertNumFailureRetries(transformWizard, data.numFailureRetries);
        await assertNoA11yViolations(page);
      });

      await test.step('shows the create step', async () => {
        await assertCreateStep(transformWizard, data.numFailureRetries);
        await assertNoA11yViolations(page);
      });

      await test.step('runs the transform and shows it in the list', async () => {
        await assertRunsBatchTransform(transformWizard);
        await transformWizard.returnToManagement();
        await transformManagement.refreshList();
        await transformManagement.filterByTransformId(data.transformId);
        await assertTransformRow(transformManagement, data.transformId, {
          description: data.description,
          type: 'pivot',
          status: 'stopped',
          mode: 'batch',
          progress: 100,
          health: 'Healthy',
        });
        await assertNoA11yViolations(page);
      });

      await test.step('shows the destination index in Discover', async () => {
        await assertStoppedTransformRowActions(transformManagement, data.transformId);
        await transformManagement.clickRowAction(data.transformId, 'Discover');
        await assertDiscoverHits(page, pageObjects, {
          index: destinationIndex,
          hasTimeField: data.destinationHasTimeField,
          hits: data.discoverHits,
        });
      });
    });
  }
});
