/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { getDataSourceByIdApiPath } from '../fixtures/api_paths';
import { test, CUSTOM_ROLES } from '../fixtures';

const S3_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const S3_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

test.describe('ES|QL Data Federation — data sources CRUD', { tag: tags.stateful.classic }, () => {
  let dataSourceName: string | undefined;

  test.afterAll(async ({ kbnClient }) => {
    if (!dataSourceName) {
      return;
    }

    try {
      await kbnClient.request({
        method: 'DELETE',
        path: getDataSourceByIdApiPath(dataSourceName),
      });
    } catch {
      // ignore cleanup errors
    }
  });

  test('creates, edits, and deletes a data source', async ({ browserAuth, page, pageObjects }) => {
    const createdDataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
    dataSourceName = createdDataSourceName;
    const initialDescription = 'Scout data source (initial)';
    const updatedDescription = 'Scout data source (updated)';

    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

    await test.step('navigate to the Data Federation management app', async () => {
      await pageObjects.dataFederation.goto();

      await page.getByRole('tab', { name: 'Data sources' }).click();
      await expect(page.getByRole('tab', { name: 'Data sources' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(pageObjects.dataFederation.dataSourcesTable).toBeVisible();
    });

    await test.step('page has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    await test.step('create a new S3 data source', async () => {
      await pageObjects.dataFederation.createS3DataSource({
        name: createdDataSourceName,
        description: initialDescription,
        region: 'us-east-1',
        accessKey: S3_ACCESS_KEY,
        secretKey: S3_SECRET_KEY,
      });
    });

    const row = pageObjects.dataFederation.getDataSourceRow(createdDataSourceName);

    await test.step('new data source appears in the table', async () => {
      await expect(row).toBeVisible();
      await expect(row).toContainText(initialDescription);
    });

    await test.step('edit the data source description', async () => {
      await pageObjects.dataFederation.editDataSourceDescription({
        dataSourceName: createdDataSourceName,
        description: updatedDescription,
      });
      await expect(row).toContainText(updatedDescription);
    });

    await test.step('delete the data source', async () => {
      await pageObjects.dataFederation.deleteDataSource(createdDataSourceName);
    });
  });
});
