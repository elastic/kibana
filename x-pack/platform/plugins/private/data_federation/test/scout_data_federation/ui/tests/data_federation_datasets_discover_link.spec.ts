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

const DISCOVER_BUTTON_NAME = 'Open in Discover';

test.describe(
  'ES|QL Data Federation — dataset Discover link',
  { tag: tags.local.stateful.classic },
  () => {
    const dataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
    const dataSetName = `scout-dataset-discover-${randomUUID().slice(0, 8)}`;

    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'PUT',
        path: getDataSourceByIdApiPath(dataSourceName),
        body: {
          type: 's3',
          description: 'Scout Discover link source',
          settings: {
            access_key: 'AKIAIOSFODNN7EXAMPLE',
            secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        },
      });
      await kbnClient.request({
        method: 'PUT',
        path: getDataSetByIdApiPath(dataSetName),
        body: {
          data_source: dataSourceName,
          resource: 's3://scout-bucket/path/**/*.parquet',
          settings: { format: 'parquet' },
        },
      });
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.request({ method: 'DELETE', path: getDataSetByIdApiPath(dataSetName) });
      await kbnClient.request({ method: 'DELETE', path: getDataSourceByIdApiPath(dataSourceName) });
    });

    test('opens the dataset in Discover with an ES|QL query', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const expectedQuery = `FROM ${dataSetName}`;
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager_with_discover);
      await pageObjects.dataFederation.goto();
      await pageObjects.dataFederation.selectTab('Datasets');
      await pageObjects.dataFederation.filterDataSets(dataSetName);

      const discoverButton = pageObjects.dataFederation
        .getDataSetRow(dataSetName)
        .getByRole('button', { name: DISCOVER_BUTTON_NAME });
      await expect(discoverButton).toBeVisible();

      await discoverButton.click();
      await expect(page).toHaveURL(/\/app\/discover/);
      await expect(page.testSubj.locator('ESQLEditor')).toBeVisible();
      await expect.poll(() => pageObjects.discover.getEsqlQueryValue()).toBe(expectedQuery);
    });

    test('hides the Discover action without Discover access', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);
      await pageObjects.dataFederation.goto();
      await pageObjects.dataFederation.selectTab('Datasets');
      await pageObjects.dataFederation.filterDataSets(dataSetName);

      const row = pageObjects.dataFederation.getDataSetRow(dataSetName);
      await expect(row).toBeVisible();
      await expect(row.getByRole('button', { name: DISCOVER_BUTTON_NAME })).toBeHidden();
    });
  }
);
