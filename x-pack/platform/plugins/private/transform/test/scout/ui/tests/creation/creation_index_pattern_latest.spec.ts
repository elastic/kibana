/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  assertCreateStep,
  assertDetailsStep,
  assertDiscoverHits,
  assertFieldStatsFlyout,
  assertNoA11yViolations,
  assertRunsBatchTransform,
  assertSourcePreview,
  assertStoppedTransformRowActions,
  assertTransformRow,
  test,
  testData,
} from '../../fixtures';

const TRANSFORM_ID = `ec_4_${Date.now()}`;
const DESTINATION_INDEX = `user-${TRANSFORM_ID}`;
const DESCRIPTION =
  'ecommerce batch transform with the latest function config, sort by order_data, country code as unique key';

test.describe('Create latest transform from a data view', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsTransformManager();
    await pageObjects.transformManagement.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.transform.deleteTransforms([TRANSFORM_ID]);
    await apiServices.transform.deleteIndices({ index: DESTINATION_INDEX });
    await apiServices.dataViews.deleteByTitle(DESTINATION_INDEX);
  });

  test('creates a batch transform with the latest function', async ({
    config,
    page,
    pageObjects,
  }) => {
    const { transformManagement, transformWizard, datePicker } = pageObjects;

    await test.step('opens the wizard for the source data view', async () => {
      await expect(transformManagement.statsBar).toBeVisible();
      await transformManagement.startTransformCreation('latest');
      await transformManagement.selectSource(testData.DATA_VIEWS.ECOMMERCE.title);
      await expect(transformWizard.defineStep).toBeVisible();
      await expect(transformWizard.uniqueKeysSelection).toBeVisible();
    });

    await test.step('loads the source preview', async () => {
      await assertSourcePreview(transformWizard, datePicker, {
        isServerless: config.serverless,
        fullTimeRange: {
          start: '2023-06-12T00:04:19.000Z',
          end: '2023-07-12T23:45:36.000Z',
        },
      });
      await assertNoA11yViolations(page);
    });

    await test.step('configures the unique keys and sort field', async () => {
      for (const fieldName of ['category.keyword', 'currency']) {
        await assertFieldStatsFlyout(
          transformWizard,
          'transformWizardUniqueKeysSelector',
          fieldName,
          'topValues'
        );
      }
      expect(await transformWizard.getUniqueKeys()).toStrictEqual([]);
      await transformWizard.addUniqueKey('geoip.country_iso_code');
      expect(await transformWizard.getUniqueKeys()).toStrictEqual(['geoip.country_iso_code']);

      await assertFieldStatsFlyout(
        transformWizard,
        'transformWizardSortFieldSelector',
        'order_date',
        'histogram'
      );
      await expect(transformWizard.getSortFieldInput()).toHaveValue('');
      await transformWizard.setSortField('order_date');
      await expect(transformWizard.getSortFieldInput()).toHaveValue('order_date');

      await expect(transformWizard.pivotPreview).toBeVisible();
      await expect(transformWizard.pivotPreviewHistogramButton).toBeHidden();
      await assertNoA11yViolations(page);
    });

    await test.step('fills the details step', async () => {
      await assertDetailsStep(transformWizard, {
        transformId: TRANSFORM_ID,
        description: DESCRIPTION,
        destinationIndex: DESTINATION_INDEX,
      });
      await transformWizard.dataViewTimeFieldSelect.selectOption('order_date');
      await expect(transformWizard.dataViewTimeFieldSelect).toHaveValue('order_date');
      await expect(transformWizard.continuousModeSwitch).not.toBeChecked();
      await assertNoA11yViolations(page);
    });

    await test.step('shows the create step', async () => {
      await assertCreateStep(transformWizard);
      await assertNoA11yViolations(page);
    });

    await test.step('runs the transform and shows it in the list', async () => {
      await assertRunsBatchTransform(transformWizard);
      await transformWizard.returnToManagement();
      await transformManagement.refreshList();
      await transformManagement.filterByTransformId(TRANSFORM_ID);
      await assertTransformRow(transformManagement, TRANSFORM_ID, {
        description: DESCRIPTION,
        type: 'latest',
        status: 'stopped',
        mode: 'batch',
        progress: 100,
        health: 'Healthy',
      });
      await assertNoA11yViolations(page);
    });

    await test.step('shows the destination index in Discover', async () => {
      await assertStoppedTransformRowActions(transformManagement, TRANSFORM_ID);
      await transformManagement.clickRowAction(TRANSFORM_ID, 'Discover');
      await assertDiscoverHits(page, pageObjects, {
        index: DESTINATION_INDEX,
        hasTimeField: true,
        hits: '10',
      });
    });
  });
});
