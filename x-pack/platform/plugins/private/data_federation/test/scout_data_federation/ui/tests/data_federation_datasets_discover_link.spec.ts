/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { decompressFromBase64 } from 'lz-string';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { getDataSetByIdApiPath, getDataSourceByIdApiPath } from '../fixtures/api_paths';
import { test, CUSTOM_ROLES } from '../fixtures';

const DISCOVER_LINK_NAME = 'Open in Discover';

test.describe(
  'ES|QL Data Federation — dataset Discover link',
  { tag: tags.stateful.classic },
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

    test('links the dataset to Discover with an ES|QL query', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const expectedQuery = `FROM "${dataSetName}"`;
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager_with_discover);
      await pageObjects.dataFederation.goto();
      await pageObjects.dataFederation.selectTab('Datasets');
      await pageObjects.dataFederation.filterDataSets(dataSetName);

      const discoverLink = pageObjects.dataFederation
        .getDataSetRow(dataSetName)
        .getByRole('link', { name: DISCOVER_LINK_NAME });
      await expect(discoverLink).toBeVisible();

      const href = await discoverLink.getAttribute('href');
      const searchParams = new URL(href ?? '', page.url()).searchParams;
      expect(searchParams.get('l')).toBe('DISCOVER_APP_LOCATOR');
      const params = JSON.parse(decompressFromBase64(searchParams.get('lz') ?? '') ?? '{}');
      expect(params.query).toStrictEqual({ esql: expectedQuery });

      await discoverLink.click();
      await expect(page).toHaveURL(/\/app\/discover/);
      await expect(page.testSubj.locator('ESQLEditor')).toBeVisible();
      await expect.poll(() => pageObjects.discover.getEsqlQueryValue()).toBe(expectedQuery);
    });

    test('hides the Discover link without Discover access', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);
      await pageObjects.dataFederation.goto();
      await pageObjects.dataFederation.selectTab('Datasets');
      await pageObjects.dataFederation.filterDataSets(dataSetName);

      const row = pageObjects.dataFederation.getDataSetRow(dataSetName);
      await expect(row).toBeVisible();
      await expect(row.getByRole('link', { name: DISCOVER_LINK_NAME })).toBeHidden();
    });
  }
);
