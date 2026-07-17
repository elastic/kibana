/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { getDataSetByIdApiPath, getDataSourceByIdApiPath } from '../fixtures/api_paths';
import { test, CUSTOM_ROLES } from '../fixtures';

test.describe('ES|QL Data Federation — datasets CRUD', { tag: tags.stateful.classic }, () => {
  test('creates, edits, and deletes a dataset', async ({
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    const dataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
    const dataSetName = `scout-dataset-${randomUUID().slice(0, 8)}`;
    const initialResource = 's3://scout-bucket/path/**/*.parquet';
    const updatedResource = 's3://scout-bucket/updated/**/*.parquet';

    const cleanupDataSet = async () => {
      try {
        await kbnClient.request({ method: 'DELETE', path: getDataSetByIdApiPath(dataSetName) });
      } catch {
        // ignore cleanup errors
      }
    };

    const cleanupDataSource = async () => {
      try {
        await kbnClient.request({
          method: 'DELETE',
          path: getDataSourceByIdApiPath(dataSourceName),
        });
      } catch {
        // ignore cleanup errors
      }
    };

    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

    try {
      await test.step('ensure a data source exists (setup)', async () => {
        await kbnClient.request({
          method: 'PUT',
          path: getDataSourceByIdApiPath(dataSourceName),
          body: {
            type: 's3',
            description: 'Scout dataset CRUD source',
            settings: {
              region: 'us-east-1',
              access_key: 'AKIAIOSFODNN7EXAMPLE',
              secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            },
          },
        });
      });

      await test.step('navigate to the Data Federation management app', async () => {
        await pageObjects.dataFederation.goto();
      });

      await test.step('create a dataset', async () => {
        await expect(pageObjects.dataFederation.createDataSetButton).toBeEnabled();
        await pageObjects.dataFederation.createDataSetButton.click();

        await expect(page.testSubj.locator('createDatasetFlyout')).toBeVisible();

        await page.testSubj
          .locator('createDatasetFlyoutDataSource')
          .selectOption({ value: dataSourceName });
        await page.testSubj.locator('createDatasetFlyoutName').fill(dataSetName);
        await page.testSubj.locator('createDatasetFlyoutResource').fill(initialResource);
        await page.testSubj
          .locator('createDatasetFlyoutSettingsFormat')
          .selectOption({ value: 'parquet' });

        await page.testSubj.locator('createDatasetFlyoutSubmit').click();
        await expect(page.testSubj.locator('createDatasetFlyoutSaveError')).toHaveCount(0);
        await expect(page.testSubj.locator('createDatasetFlyout')).toBeHidden();
      });

      const row = pageObjects.dataFederation.dataSetsTable
        .locator('tr')
        .filter({ hasText: dataSetName });

      await test.step('dataset appears in the table', async () => {
        await expect(row).toBeVisible();
        await expect(row).toContainText(dataSourceName);
        await expect(row).toContainText(initialResource);
      });

      await test.step('edit the dataset resource', async () => {
        await row.locator('[data-test-subj="dataSetsSetsEditButton"]').click();
        await expect(page.testSubj.locator('editDatasetFlyout')).toBeVisible();

        await page.testSubj.locator('createDatasetFlyoutResource').fill(updatedResource);
        await page.testSubj.locator('createDatasetFlyoutSubmit').click();

        await expect(page.testSubj.locator('editDatasetFlyout')).toBeHidden();
        await expect(row).toContainText(updatedResource);
      });

      await test.step('delete the dataset', async () => {
        await row.locator('[data-test-subj="dataSetsSetsDeleteIconButton"]').click();

        const modal = page.getByRole('alertdialog');
        await expect(modal).toBeVisible();

        await modal.locator('[data-test-subj="confirmModalConfirmButton"]').click();
        await expect(modal).toBeHidden();
        await expect(row).toBeHidden();
      });
    } finally {
      await cleanupDataSet();
      await cleanupDataSource();
    }
  });
});
