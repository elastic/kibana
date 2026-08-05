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
  let dataSourceName: string | undefined;
  let dataSetName: string | undefined;

  test.afterAll(async ({ kbnClient }) => {
    if (dataSetName) {
      try {
        await kbnClient.request({ method: 'DELETE', path: getDataSetByIdApiPath(dataSetName) });
      } catch {
        // ignore cleanup errors
      }
    }

    if (dataSourceName) {
      try {
        await kbnClient.request({
          method: 'DELETE',
          path: getDataSourceByIdApiPath(dataSourceName),
        });
      } catch {
        // ignore cleanup errors
      }
    }
  });

  test('creates, edits, and deletes a dataset', async ({
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    const createdDataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
    const createdDataSetName = `scout-dataset-${randomUUID().slice(0, 8)}`;
    dataSourceName = createdDataSourceName;
    dataSetName = createdDataSetName;
    const initialResource = 's3://scout-bucket/path/**/*.parquet';
    const updatedResource = 's3://scout-bucket/updated/**/*.parquet';

    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

    await test.step('ensure a data source exists (setup)', async () => {
      await kbnClient.request({
        method: 'PUT',
        path: getDataSourceByIdApiPath(createdDataSourceName),
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

    await test.step('navigate to the Data Federation management app and ensure the data sets tab is selected', async () => {
      await pageObjects.dataFederation.goto();

      await page.getByRole('tab', { name: 'Datasets' }).click();
      await expect(page.getByRole('tab', { name: 'Datasets' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(pageObjects.dataFederation.dataSetsTable).toBeVisible();
    });

    await test.step('page has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    await test.step('create a dataset', async () => {
      await pageObjects.dataFederation.createDataSet({
        dataSourceName: createdDataSourceName,
        name: createdDataSetName,
        resource: initialResource,
        format: 'parquet',
      });
    });

    const row = pageObjects.dataFederation.getDataSetRow(createdDataSetName);

    await test.step('dataset appears in the table', async () => {
      await expect(row).toBeVisible();
      await expect(row).toContainText(createdDataSourceName);
      await expect(row).toContainText(initialResource);
    });

    await test.step('edit the dataset resource', async () => {
      await pageObjects.dataFederation.editDataSetResource({
        dataSetName: createdDataSetName,
        resource: updatedResource,
      });
      await expect(row).toContainText(updatedResource);
    });

    await test.step('delete the dataset', async () => {
      await pageObjects.dataFederation.deleteDataSet(createdDataSetName);
    });
  });
});
